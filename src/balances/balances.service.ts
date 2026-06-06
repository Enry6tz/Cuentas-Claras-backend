import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BalancesService {
  private readonly logger = new Logger(BalancesService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async recalculateAllActiveTrips() {
    const activeTrips = await this.prisma.trip.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    });
    this.logger.log(`Recalculating balances for ${activeTrips.length} active trips`);
    for (const trip of activeTrips) {
      await this.recalculateTripBalances(trip.id);
    }
  }

  async getBalances(tripId: string) {
    const participations = await this.prisma.participation.findMany({
      where: { tripId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    const balances = participations.map((p) => {
      return {
        userId: p.userId,
        userName: p.user.name,
        balance: p.currentBalance.toFixed(2),
      };
    });

    return balances;
  }

  async getSettlement(tripId: string) {
    const participations = await this.prisma.participation.findMany({
      where: { tripId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    const debtors: { userId: string; userName: string; amount: number }[] = [];
    const creditors: { userId: string; userName: string; amount: number }[] = [];

    for (const p of participations) {
      const bal = Number(p.currentBalance);
      if (bal < 0) {
        debtors.push({ userId: p.userId, userName: p.user.name, amount: -bal });
      } else if (bal > 0) {
        creditors.push({ userId: p.userId, userName: p.user.name, amount: bal });
      }
    }

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const settlement: {
      fromUserId: string;
      fromUserName: string;
      toUserId: string;
      toUserName: string;
      amount: string;
    }[] = [];

    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const minAmount = Math.min(debtors[i].amount, creditors[j].amount);
      const roundedAmount = Math.round(minAmount * 100) / 100;

      if (roundedAmount > 0) {
        settlement.push({
          fromUserId: debtors[i].userId,
          fromUserName: debtors[i].userName,
          toUserId: creditors[j].userId,
          toUserName: creditors[j].userName,
          amount: roundedAmount.toFixed(2),
        });
      }

      debtors[i].amount = Math.round((debtors[i].amount - roundedAmount) * 100) / 100;
      creditors[j].amount = Math.round((creditors[j].amount - roundedAmount) * 100) / 100;

      if (debtors[i].amount < 0.01) i++;
      if (creditors[j].amount < 0.01) j++;
    }

    return settlement;
  }

  async recalculateTripBalances(tripId: string): Promise<void> {
    const expenseDetails = await this.prisma.expenseDetail.findMany({
      where: {
        expense: {
          tripId,
          deletedAt: null,
        },
      },
    });

    const payments = await this.prisma.payment.findMany({
      where: {
        tripId,
        deletedAt: null,
      },
    });

    const participations = await this.prisma.participation.findMany({
      where: { tripId },
    });

    const balanceMap = new Map<string, Decimal>();
    for (const p of participations) {
      balanceMap.set(p.userId, new Decimal(0));
    }

    for (const ed of expenseDetails) {
      const current = balanceMap.get(ed.userId) ?? new Decimal(0);
      balanceMap.set(ed.userId, current.add(ed.amountPaid).sub(ed.amountOwed));
    }

    for (const p of payments) {
      // Un pago SALDA deuda: el deudor (saldo negativo) sube hacia 0 al pagar,
      // y el acreedor (saldo positivo) baja hacia 0 al cobrar.
      const debtorBal = balanceMap.get(p.debtorId) ?? new Decimal(0);
      balanceMap.set(p.debtorId, debtorBal.add(p.amount));

      const creditorBal = balanceMap.get(p.creditorId) ?? new Decimal(0);
      balanceMap.set(p.creditorId, creditorBal.sub(p.amount));
    }

    for (const [userId, balance] of balanceMap) {
      await this.prisma.participation.update({
        where: { userId_tripId: { userId, tripId } },
        data: { currentBalance: balance.toDecimalPlaces(2) },
      });
    }
  }
}
