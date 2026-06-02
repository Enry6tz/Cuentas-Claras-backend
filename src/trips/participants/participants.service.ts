import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ParticipationRole, TripStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ParticipantsService {
  constructor(private prisma: PrismaService) {}

  async findByTrip(tripId: string) {
    await this.assertTripExists(tripId);

    return this.prisma.participation.findMany({
      where: { tripId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  async addParticipant(tripId: string, actorId: string, userId: string) {
    await this.assertTripExists(tripId);
    await this.assertTripActive(tripId);
    await this.assertIsCreator(tripId, actorId);

    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!userExists) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const existingParticipation =
      await this.prisma.participation.findUnique({
        where: { userId_tripId: { userId, tripId } },
      });
    if (existingParticipation) {
      throw new ConflictException('El usuario ya participa en este viaje');
    }

    return this.prisma.participation.create({
      data: { userId, tripId, role: ParticipationRole.MEMBER },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  async changeRole(
    tripId: string,
    actorId: string,
    targetUserId: string,
    newRole: ParticipationRole,
  ) {
    await this.assertTripExists(tripId);
    await this.assertTripActive(tripId);
    await this.assertIsCreator(tripId, actorId);

    if (newRole === ParticipationRole.CREATOR) {
      throw new BadRequestException('No puedes asignar el rol de creador');
    }

    const targetParticipation =
      await this.prisma.participation.findUnique({
        where: { userId_tripId: { userId: targetUserId, tripId } },
      });
    if (!targetParticipation) {
      throw new NotFoundException('El usuario no es participante de este viaje');
    }

    if (targetParticipation.role === ParticipationRole.CREATOR) {
      throw new BadRequestException(
        'No puedes cambiar tu propio rol siendo el creador del viaje',
      );
    }

    return this.prisma.participation.update({
      where: { userId_tripId: { userId: targetUserId, tripId } },
      data: { role: newRole },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  async removeParticipant(tripId: string, actorId: string, targetUserId: string) {
    await this.assertTripExists(tripId);
    await this.assertTripActive(tripId);
    await this.assertIsCreator(tripId, actorId);

    const targetParticipation =
      await this.prisma.participation.findUnique({
        where: { userId_tripId: { userId: targetUserId, tripId } },
      });
    if (!targetParticipation) {
      throw new NotFoundException('El usuario no es participante de este viaje');
    }

    if (targetParticipation.role === ParticipationRole.CREATOR) {
      throw new BadRequestException(
        'No puedes eliminar al creador del viaje',
      );
    }

    await this.verifyBalanceIsZero(tripId, targetUserId);

    await this.prisma.participation.delete({
      where: { userId_tripId: { userId: targetUserId, tripId } },
    });
  }

  async leaveTrip(tripId: string, userId: string) {
    await this.assertTripExists(tripId);
    await this.assertTripActive(tripId);

    const participation = await this.prisma.participation.findUnique({
      where: { userId_tripId: { userId, tripId } },
    });
    if (!participation) {
      throw new ForbiddenException('No eres participante de este viaje');
    }

    if (participation.role === ParticipationRole.CREATOR) {
      throw new BadRequestException(
        'El creador no puede abandonar el viaje. Transfiere la propiedad primero.',
      );
    }

    await this.verifyBalanceIsZero(tripId, userId);

    await this.prisma.participation.delete({
      where: { userId_tripId: { userId, tripId } },
    });
  }

  private async verifyBalanceIsZero(tripId: string, userId: string) {
    const balance = await this.calculateBalance(tripId, userId);

    if (!balance.isZero()) {
      throw new ConflictException(
        'No se puede completar la operación porque el balance no es 0',
      );
    }
  }

  private async calculateBalance(
    tripId: string,
    userId: string,
  ): Promise<Decimal> {
    const expenseDetails = await this.prisma.expenseDetail.findMany({
      where: {
        userId,
        expense: { tripId, deletedAt: null },
      },
    });

    const paymentsAsDebtor = await this.prisma.payment.findMany({
      where: { debtorId: userId, tripId, deletedAt: null },
    });

    const paymentsAsCreditor = await this.prisma.payment.findMany({
      where: { creditorId: userId, tripId, deletedAt: null },
    });

    const fromExpenses = expenseDetails.reduce(
      (sum, d) => sum.add(d.amountPaid).sub(d.amountOwed),
      new Decimal(0),
    );

    const fromPayments = paymentsAsCreditor
      .reduce((sum, p) => sum.add(p.amount), new Decimal(0))
      .sub(
        paymentsAsDebtor.reduce((sum, p) => sum.add(p.amount), new Decimal(0)),
      );

    return fromExpenses.add(fromPayments);
  }

  private async assertTripExists(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });
    if (!trip || trip.deletedAt) {
      throw new NotFoundException('Viaje no encontrado');
    }
  }

  private async assertTripActive(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { status: true },
    });
    if (trip?.status === TripStatus.FINALIZED) {
      throw new BadRequestException('El viaje está finalizado');
    }
  }

  private async assertIsCreator(tripId: string, userId: string) {
    const participation = await this.prisma.participation.findUnique({
      where: { userId_tripId: { userId, tripId } },
    });
    if (!participation) {
      throw new ForbiddenException('No eres participante de este viaje');
    }
    if (participation.role !== ParticipationRole.CREATOR) {
      throw new ForbiddenException(
        'Solo el creador del viaje puede realizar esta acción',
      );
    }
  }
}
