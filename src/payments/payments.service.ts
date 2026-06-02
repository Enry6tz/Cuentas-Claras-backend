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
        throw new NotFoundException('Debtor and creditor must be different');
      }

      const participantIds = [dto.debtorId, dto.creditorId];
      const participants = await this.prisma.participation.findMany({
        where: { tripId, userId: { in: participantIds } },
      });

      if (participants.length !== 2) {
        const foundIds = participants.map((p) => p.userId);
        const missing = participantIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(
          `Users are not participants of this trip: ${missing.join(', ')}`,
        );
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

  async remove(userId: string, tripId: string, paymentId: string) {
    await this.assertIsParticipant(userId, tripId);

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tripId, deletedAt: null },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const participation = await this.prisma.participation.findUnique({
      where: { userId_tripId: { userId, tripId } },
    });

    if (
      participation?.role !== ParticipationRole.CREATOR &&
      payment.debtorId !== userId
    ) {
      throw new ForbiddenException(
        'Only the debtor or trip creator can delete this payment',
      );
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
      throw new NotFoundException('Trip not found');
    }

    if (participation.role === ParticipationRole.SUPERVISOR) {
      throw new ForbiddenException('Supervisors cannot create payments');
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
        throw new NotFoundException('Trip not found');
      }
      throw new ForbiddenException('You are not a participant of this trip');
    }
  }
}
