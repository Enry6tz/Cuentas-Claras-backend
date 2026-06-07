import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ParticipationRole, Prisma, TripStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

/**
 * El SERVICE concentra la logica de negocio del modulo Trips.
 *
 * Filosofia NestJS:
 *   - Controller = "traduce HTTP <-> objetos del dominio". Solo recibe el
 *     request, llama al service, devuelve la respuesta.
 *   - Service = "implementa las reglas". Es donde vive el SQL/Prisma, las
 *     validaciones de reglas de negocio (BR01..BR05), las transacciones, etc.
 *
 * Ventajas de separar:
 *   - El service se puede testear sin levantar HTTP.
 *   - Si manana exponemos GraphQL o un job batch, el mismo service sirve.
 *   - El controller queda chico y obvio de leer.
 *
 * `@Injectable()` marca esta clase como un "provider" — Nest la instancia
 * automaticamente y la inyecta donde la pidamos (Dependency Injection).
 */
@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * CREATE — crear un viaje.
   *
   * Reglas:
   *  1. El user que crea el trip queda automaticamente como CREATOR.
   *  2. La operacion es ATOMICA: o se crean Trip + Participation, o no se crea
   *     nada. Si la creacion de Participation falla, no queremos un Trip
   *     huerfano sin creator. Por eso usamos `prisma.$transaction`.
   *
   * `tx` dentro de la transaccion es un Prisma client igual al normal pero
   * todas las queries que corre quedan en la misma transaccion DB. Si algo
   * tira excepcion, Prisma hace rollback automatico.
   */
  async create(userId: string, dto: CreateTripDto) {
    return this.prisma.$transaction(async (tx) => {
      const trip = await tx.trip.create({
        data: {
          name: dto.name,
          description: dto.description,
          // El DTO trae strings ISO; el campo de Prisma es Date, asi que
          // convertimos. Si el campo es undefined, Prisma lo deja en null.
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          baseCurrency: dto.baseCurrency,
          iconId: dto.iconId,
          colorId: dto.colorId,
          // status arranca en ACTIVE por default del schema, no hace falta setearlo.
        },
      });

      await tx.participation.create({
        data: {
          userId,
          tripId: trip.id,
          role: ParticipationRole.CREATOR,
        },
      });

      // Devolvemos el trip con su unica participation (la del creator) ya
      // poblada, asi el frontend tiene todo lo que necesita en una sola
      // request sin tener que hacer un GET despues.
      return tx.trip.findUniqueOrThrow({
        where: { id: trip.id },
        include: {
          participations: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatarUrl: true },
              },
            },
          },
        },
      });
    });
  }

  /**
   * READ ALL — listar los trips de un usuario.
   *
   * "Los trips de un usuario" = trips donde el usuario tiene una Participation.
   * Filtramos `deletedAt: null` para excluir trips soft-deleted.
   *
   * Prisma genera SQL con un JOIN/EXISTS contra `participations`. La sintaxis
   * `participations: { some: { userId } }` significa "trips donde existe AL
   * MENOS UNA participation con este userId".
   */
  async findAllForUser(userId: string) {
    return this.prisma.trip.findMany({
      where: {
        deletedAt: null,
        participations: {
          some: { userId },
        },
      },
      // Incluimos info util para la lista (rol del user, cantidad de
      // participantes). Si la lista crece mucho, esto se puede paginar despues.
      include: {
        participations: {
          select: {
            userId: true,
            role: true,
          },
        },
        _count: {
          select: { participations: true, expenses: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * READ ONE — detalle de un trip.
   *
   * Validamos dos cosas:
   *  1. El trip existe y no esta soft-deleted.
   *  2. El user que pregunta es participante (no leakear datos de trips ajenos).
   *
   * Si falla (1) -> 404. Si falla (2) -> 403.
   * Algunos prefieren devolver 404 en ambos casos para no revelar la existencia
   * del recurso. Aca devolvemos 403 porque ya validamos antes que existe;
   * si quisieras "sigilar" la existencia, mandarias 404 en ambos.
   */
  async findOne(userId: string, tripId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, deletedAt: null },
      include: {
        participations: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException({
        code: 'TRIP_NOT_FOUND',
        message: 'Trip not found',
      });
    }

    const isParticipant = trip.participations.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new ForbiddenException({
        code: 'NOT_TRIP_PARTICIPANT',
        message: 'You are not a participant of this trip',
      });
    }

    if (trip.status === TripStatus.ACTIVE && trip.endDate && new Date() >= trip.endDate) {
      await this.prisma.trip.update({
        where: { id: tripId },
        data: { status: TripStatus.FINALIZED },
      });
      trip.status = TripStatus.FINALIZED;
    }

    return trip;
  }

  /**
   * UPDATE — actualizar un trip.
   *
   * BR02: solo el CREATOR del trip puede modificarlo.
   *
   * Antes de tocar la DB, llamamos `assertIsCreator` que valida la regla.
   * Si pasa, hacemos el update. Si no, ya tiro la excepcion correspondiente.
   */
  async update(userId: string, tripId: string, dto: UpdateTripDto) {
    await this.assertIsCreator(userId, tripId);

    // Construimos el `data` solo con los campos que vinieron en el dto.
    // Si el cliente NO mando un campo, no lo tocamos (no lo seteamos a null).
    const data: Prisma.TripUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.baseCurrency !== undefined) data.baseCurrency = dto.baseCurrency;
    if (dto.iconId !== undefined) data.iconId = dto.iconId;
    if (dto.colorId !== undefined) data.colorId = dto.colorId;
    if (dto.startDate !== undefined) {
      data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    }
    if (dto.endDate !== undefined) {
      data.endDate = dto.endDate ? new Date(dto.endDate) : null;
    }

    return this.prisma.trip.update({
      where: { id: tripId },
      data,
      include: {
        participations: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });
  }

  /**
   * DELETE (soft) — borrar un trip.
   *
   * BR02: solo el CREATOR puede borrar.
   *
   * No hacemos `prisma.trip.delete(...)` (hard delete). En su lugar, marcamos
   * `deletedAt = NOW()`. Asi:
   *   - Conservamos historial financiero (gastos y pagos quedan accesibles
   *     para auditoria si hace falta).
   *   - Las queries de listado filtran por `deletedAt: null` y no lo ven mas.
   *   - Si despues nos arrepentimos, podemos "restaurar" seteando deletedAt: null.
   */
  async remove(userId: string, tripId: string) {
    await this.assertIsCreator(userId, tripId);

    await this.prisma.trip.update({
      where: { id: tripId },
      data: { deletedAt: new Date() },
    });

    // Devolvemos void/empty para que el controller responda 204 No Content.
  }

  /**
   * FINALIZE — finalizar un viaje.
   *
   * Solo el CREATOR puede finalizar. Si se finaliza antes de la endDate (o no
   * hay endDate), todos los balances deben estar en 0. Si la endDate ya pasó,
   * se permite sin restricción de balance (el viaje se auto-finaliza).
   */
  async finalize(userId: string, tripId: string) {
    await this.assertIsCreator(userId, tripId);

    const trip = await this.prisma.trip.findUniqueOrThrow({
      where: { id: tripId },
    });

    if (trip.status !== TripStatus.ACTIVE) {
      throw new BadRequestException({
        code: 'TRIP_NOT_ACTIVE',
        message: 'Solo se pueden finalizar viajes activos',
      });
    }

    const now = new Date();
    const isEarlyFinalization = !trip.endDate || now < trip.endDate;
    if (isEarlyFinalization) {
      const hasDebts = await this.hasOutstandingBalance(tripId);
      if (hasDebts) {
        throw new BadRequestException({
          code: 'OUTSTANDING_BALANCES',
          message:
            'No se puede finalizar el viaje antes de tiempo porque hay balances pendientes. Todos los balances deben estar en 0.',
        });
      }
    }

    return this.prisma.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.FINALIZED },
      include: {
        participations: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });
  }

  /**
   * Cron diario: auto-finaliza viajes cuya endDate ya pasó.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async autoFinalizeTripsOnEndDate() {
    const now = new Date();
    const result = await this.prisma.trip.updateMany({
      where: {
        status: TripStatus.ACTIVE,
        endDate: { lte: now },
        deletedAt: null,
      },
      data: { status: TripStatus.FINALIZED },
    });

    if (result.count > 0) {
      this.logger.log(
        `Auto-finalized ${result.count} trips that reached their end date`,
      );
    }
  }

  private async hasOutstandingBalance(tripId: string): Promise<boolean> {
    const participations = await this.prisma.participation.findMany({
      where: { tripId },
      select: { currentBalance: true },
    });
    return participations.some((p) => Number(p.currentBalance) !== 0);
  }

  /**
   * Helper privado: tira excepcion si el user no es CREATOR del trip.
   *
   * Lo extraemos a un metodo aparte porque update() y remove() lo comparten.
   * Si manana agregamos otro metodo restringido al creator (ej. cerrar trip,
   * agregar/quitar participantes), tambien lo llama.
   */
  private async assertIsCreator(userId: string, tripId: string) {
    // El indice unique compuesto `(userId, tripId)` permite usar findUnique aca.
    const participation = await this.prisma.participation.findUnique({
      where: { userId_tripId: { userId, tripId } },
    });

    // Tres casos a contemplar:
    //   - No hay participation -> 404 (el user no es parte del trip)
    //   - Hay participation pero no es CREATOR -> 403
    //   - Hay participation CREATOR pero el trip esta soft-deleted -> 404
    if (!participation) {
      throw new NotFoundException({
        code: 'TRIP_NOT_FOUND',
        message: 'Trip not found',
      });
    }
    if (participation.role !== ParticipationRole.CREATOR) {
      throw new ForbiddenException({
        code: 'ONLY_CREATOR_ALLOWED',
        message: 'Only the trip creator can perform this action',
      });
    }

    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip || trip.deletedAt) {
      throw new NotFoundException({
        code: 'TRIP_NOT_FOUND',
        message: 'Trip not found',
      });
    }
  }
}
