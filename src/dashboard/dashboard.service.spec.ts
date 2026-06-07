import { Test, TestingModule } from '@nestjs/testing';
import { TripStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TripsService } from '../trips/trips.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: any;
  let tripsService: any;

  const mockTrips = [
    {
      id: 'trip-1',
      name: 'Active Trip',
      status: TripStatus.ACTIVE,
      baseCurrency: 'ARS',
      participations: [{ userId: 'user-1', role: 'CREATOR' }],
      _count: { participations: 3, expenses: 5 },
    },
    {
      id: 'trip-2',
      name: 'Finalized Trip',
      status: TripStatus.FINALIZED,
      baseCurrency: 'USD',
      participations: [{ userId: 'user-1', role: 'MEMBER' }],
      _count: { participations: 2, expenses: 3 },
    },
  ];

  const mockExpenses = [
    {
      id: 'exp-1',
      description: 'Cena',
      originalAmount: 100,
      baseAmount: 100,
      date: new Date('2026-06-01'),
      trip: { name: 'Active Trip', id: 'trip-1' },
    },
  ];

  beforeEach(async () => {
    prisma = {
      expense: {
        findMany: jest.fn().mockResolvedValue(mockExpenses),
      },
      participation: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    tripsService = {
      findAllForUser: jest.fn().mockResolvedValue(mockTrips),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: TripsService, useValue: tripsService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('getUserDashboard', () => {
    it('should return dashboard with trip counts and recent activity', async () => {
      const result = await service.getUserDashboard('user-1');

      expect(result.activeTrips).toBe(1);
      expect(result.totalTrips).toBe(2);
      expect(result.balanceTotal).toBe('0');
      expect(result.recentActivity).toHaveLength(1);
      expect(result.recentActivity[0].type).toBe('expense');
      expect(result.recentActivity[0].tripName).toBe('Active Trip');
    });

    it('should return zero trips for user with no trips', async () => {
      tripsService.findAllForUser.mockResolvedValue([]);
      prisma.expense.findMany.mockResolvedValue([]);

      const result = await service.getUserDashboard('user-empty');

      expect(result.activeTrips).toBe(0);
      expect(result.totalTrips).toBe(0);
      expect(result.recentActivity).toHaveLength(0);
    });

    it('should return empty recent activity when there are no expenses', async () => {
      prisma.expense.findMany.mockResolvedValue([]);

      const result = await service.getUserDashboard('user-1');

      expect(result.activeTrips).toBe(1);
      expect(result.totalTrips).toBe(2);
      expect(result.recentActivity).toEqual([]);
    });
  });
});
