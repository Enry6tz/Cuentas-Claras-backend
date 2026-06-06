import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ParticipationRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BalancesService } from '../balances/balances.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { QueryMyPaymentsDto } from './dto/query-my-payments.dto';

const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
} as const;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private balancesService: BalancesService,
  ) {}

  async create(userId: string, tripId: string, dto: CreatePaymentDto) {
    try {
      await this.assertCanCreate(userId, tripId);

      if (dto.debtorId === dto.creditorId) {
        throw new NotFoundException({
          code: 'DEBTOR_CREDITOR_SAME',
          message: 'Debtor and creditor must be different',
        });
      }

      const participantIds = [dto.debtorId, dto.creditorId];
      const participants = await this.prisma.participation.findMany({
        where: { tripId, userId: { in: participantIds } },
      });

      if (participants.length !== 2) {
        const foundIds = participants.map((p) => p.userId);
        const missing = participantIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundException({
          code: 'USERS_NOT_PARTICIPANTS',
          message: `Users are not participants of this trip: ${missing.join(', ')}`,
        });
      }

      const payment = await this.prisma.$transaction(async (tx) => {
        return tx.payment.create({
          data: {
            debtorId: dto.debtorId,
            creditorId: dto.creditorId,
            tripId,
            amount: dto.amount,
            note: dto.note,
            date: dto.date ? new Date(dto.date) : new Date(),
          },
          include: {
            debtor: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
            creditor: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        });
      });

      await this.balancesService.recalculateTripBalances(tripId);

      return payment;
    } catch (error) {
      this.logger.error(`Failed to create payment for trip ${tripId}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  async findAll(userId: string, tripId: string) {
    await this.assertIsParticipant(userId, tripId);

    return this.prisma.payment.findMany({
      where: { tripId, deletedAt: null },
      include: {
        debtor: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        creditor: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Lista paginada de pagos del usuario a través de TODOS sus viajes (aquellos
   * donde participa). Filtros por viaje, rol (deudor/acreedor), texto y rango de
   * fechas. Pensado para la página global de Pagos.
   */
  async findAllForUser(userId: string, query: QueryMyPaymentsDto) {
    const { page, limit } = query;

    const where: Prisma.PaymentWhereInput = {
      deletedAt: null,
      trip: {
        deletedAt: null,
        participations: { some: { userId } },
      },
    };

    if (query.tripId) where.tripId = query.tripId;
    if (query.role === 'debtor') where.debtorId = userId;
    else if (query.role === 'creditor') where.creditorId = userId;
    if (query.q) {
      where.note = { contains: query.q, mode: 'insensitive' };
    }
    if (query.from || query.to) {
      const date: Prisma.DateTimeFilter = {};
      if (query.from) date.gte = new Date(query.from);
      if (query.to) {
        const end = new Date(query.to);
        end.setHours(23, 59, 59, 999);
        date.lte = end;
      }
      where.date = date;
    }

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          debtor: { select: PUBLIC_USER_SELECT },
          creditor: { select: PUBLIC_USER_SELECT },
          trip: { select: { id: true, name: true, baseCurrency: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { items, total, page, limit, hasMore: page * limit < total };
  }

  async remove(userId: string, tripId: string, paymentId: string) {
    await this.assertIsParticipant(userId, tripId);

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tripId, deletedAt: null },
    });

    if (!payment) {
      throw new NotFoundException({
        code: 'PAYMENT_NOT_FOUND',
        message: 'Payment not found',
      });
    }

    const participation = await this.prisma.participation.findUnique({
      where: { userId_tripId: { userId, tripId } },
    });

    if (
      participation?.role !== ParticipationRole.CREATOR &&
      payment.debtorId !== userId
    ) {
      throw new ForbiddenException({
        code: 'ONLY_DEBTOR_OR_CREATOR',
        message: 'Only the debtor or trip creator can delete this payment',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: { deletedAt: new Date() },
      });
    });

    await this.balancesService.recalculateTripBalances(tripId);
  }

  private async assertCanCreate(userId: string, tripId: string) {
    const participation = await this.prisma.participation.findUnique({
      where: { userId_tripId: { userId, tripId } },
    });

    if (!participation) {
      throw new NotFoundException({
        code: 'TRIP_NOT_FOUND',
        message: 'Trip not found',
      });
    }

    if (participation.role === ParticipationRole.SUPERVISOR) {
      throw new ForbiddenException({
        code: 'SUPERVISOR_CANNOT_CREATE_PAYMENT',
        message: 'Supervisors cannot create payments',
      });
    }
  }

  private async assertIsParticipant(userId: string, tripId: string) {
    const participation = await this.prisma.participation.findUnique({
      where: { userId_tripId: { userId, tripId } },
    });

    if (!participation) {
      const trip = await this.prisma.trip.findUnique({
        where: { id: tripId },
      });
      if (!trip || trip.deletedAt) {
        throw new NotFoundException({
        code: 'TRIP_NOT_FOUND',
        message: 'Trip not found',
      });
      }
      throw new ForbiddenException({
        code: 'NOT_TRIP_PARTICIPANT',
        message: 'You are not a participant of this trip',
      });
    }
  }
}
