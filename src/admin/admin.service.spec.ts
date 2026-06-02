import { Test, TestingModule } from '@nestjs/testing';
import { TripStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: any;

  const mockTrips = [
    {
      id: 'trip-1',
      name: 'Trip 1',
      status: TripStatus.ACTIVE,
      baseCurrency: 'ARS',
      _count: { participations: 3, expenses: 5 },
    },
    {
      id: 'trip-2',
      name: 'Trip 2',
      status: TripStatus.FINALIZED,
      baseCurrency: 'USD',
      _count: { participations: 2, expenses: 3 },
    },
  ];

  beforeEach(async () => {
    prisma = {
      trip: {
        findMany: jest.fn().mockResolvedValue(mockTrips),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('getAllTrips', () => {
    it('should return all non-deleted trips', async () => {
      const result = await service.getAllTrips();

      expect(result).toHaveLength(2);
      expect(prisma.trip.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: {
          _count: { select: { participations: true, expenses: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result[0].name).toBe('Trip 1');
      expect(result[1].name).toBe('Trip 2');
    });

    it('should return empty array when there are no trips', async () => {
      prisma.trip.findMany.mockResolvedValue([]);

      const result = await service.getAllTrips();

      expect(result).toEqual([]);
    });
  });
});
