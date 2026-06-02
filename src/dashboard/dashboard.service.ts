import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TripsService } from '../trips/trips.service';
import { DashboardEntity } from './entities/dashboard.entity';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private tripsService: TripsService,
  ) {}

  async getUserDashboard(userId: string): Promise<DashboardEntity> {
    const trips = await this.tripsService.findAllForUser(userId);

    const activeTrips = trips.filter((t) => t.status === 'ACTIVE');
    const totalTrips = trips.length;

    const recentExpenses = await this.prisma.expense.findMany({
      where: { creatorId: userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { trip: { select: { name: true, id: true } } },
    });

    const recentActivity = recentExpenses.map((e) => ({
      type: 'expense' as const,
      description: e.description,
      amount: e.baseAmount?.toString() ?? e.originalAmount.toString(),
      tripName: e.trip.name,
      tripId: e.trip.id,
      date: e.date,
    }));

    return {
      activeTrips: activeTrips.length,
      totalTrips,
      balanceTotal: '0.00',
      recentActivity,
    };
  }
}
