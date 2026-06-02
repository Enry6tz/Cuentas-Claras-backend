import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ParticipationRole, TripStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { ParticipantsService } from './participants.service';

describe('ParticipantsService', () => {
  let service: ParticipantsService;
  let prisma: any;

  const mockTrip = {
    id: 'trip-1',
    name: 'Test Trip',
    status: TripStatus.ACTIVE,
    deletedAt: null,
  };

  const mockUser = {
    id: 'user-1',
    name: 'John',
    email: 'john@test.com',
  };

  const mockCreatorParticipation = {
    id: 'part-1',
    userId: 'user-creator',
    tripId: 'trip-1',
    role: ParticipationRole.CREATOR,
    currentBalance: new Decimal(0),
    joinedAt: new Date(),
    user: mockUser,
  };

  const mockMemberParticipation = {
    id: 'part-2',
    userId: 'user-member',
    tripId: 'trip-1',
    role: ParticipationRole.MEMBER,
    currentBalance: new Decimal(0),
    joinedAt: new Date(),
    user: mockUser,
  };

  const mockPrisma = {
    trip: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    participation: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    expenseDetail: {
      findMany: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParticipantsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ParticipantsService>(ParticipantsService);
    jest.clearAllMocks();
  });

  describe('findByTrip', () => {
    it('should return participants for a trip', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
      mockPrisma.participation.findMany.mockResolvedValue([
        mockCreatorParticipation,
        mockMemberParticipation,
      ]);

      const result = await service.findByTrip('trip-1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.participation.findMany).toHaveBeenCalledWith({
        where: { tripId: 'trip-1' },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      });
    });

    it('should throw NotFoundException when trip does not exist', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(null);

      await expect(service.findByTrip('trip-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when trip is soft-deleted', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({
        ...mockTrip,
        deletedAt: new Date(),
      });

      await expect(service.findByTrip('trip-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addParticipant', () => {
    beforeEach(() => {
      mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
      mockPrisma.participation.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    });

    it('should add a participant as MEMBER', async () => {
      mockPrisma.participation.create.mockResolvedValue(
        mockMemberParticipation,
      );

      const result = await service.addParticipant(
        'trip-1',
        'user-creator',
        'user-member',
      );

      expect(result).toEqual(mockMemberParticipation);
      expect(mockPrisma.participation.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-member',
          tripId: 'trip-1',
          role: ParticipationRole.MEMBER,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });
    });

    it('should throw ForbiddenException if actor is not CREATOR', async () => {
      mockPrisma.participation.findUnique.mockResolvedValueOnce({
        ...mockMemberParticipation,
        role: ParticipationRole.MEMBER,
      });

      await expect(
        service.addParticipant('trip-1', 'user-member', 'user-other'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if user to add does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.addParticipant('trip-1', 'user-creator', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if user is already a participant', async () => {
      mockPrisma.participation.findUnique.mockResolvedValueOnce({
        ...mockMemberParticipation,
        userId: 'user-creator',
      });

      await expect(
        service.addParticipant('trip-1', 'user-creator', 'user-creator'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if trip is FINALIZED', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({
        ...mockTrip,
        status: TripStatus.FINALIZED,
      });

      await expect(
        service.addParticipant('trip-1', 'user-creator', 'user-member'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('changeRole', () => {
    beforeEach(() => {
      mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
      mockPrisma.participation.findUnique.mockResolvedValue(
        mockMemberParticipation,
      );
    });

    it('should change a participant role', async () => {
      const updated = {
        ...mockMemberParticipation,
        role: ParticipationRole.SUPERVISOR,
      };
      mockPrisma.participation.update.mockResolvedValue(updated);

      const result = await service.changeRole(
        'trip-1',
        'user-creator',
        'user-member',
        ParticipationRole.SUPERVISOR,
      );

      expect(result.role).toBe(ParticipationRole.SUPERVISOR);
    });

    it('should throw BadRequestException when assigning CREATOR role', async () => {
      await expect(
        service.changeRole(
          'trip-1',
          'user-creator',
          'user-member',
          ParticipationRole.CREATOR,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when changing own role as CREATOR', async () => {
      mockPrisma.participation.findUnique.mockResolvedValue(
        mockCreatorParticipation,
      );

      await expect(
        service.changeRole(
          'trip-1',
          'user-creator',
          'user-creator',
          ParticipationRole.MEMBER,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if target user is not a participant', async () => {
      mockPrisma.participation.findUnique.mockResolvedValue(null);

      await expect(
        service.changeRole(
          'trip-1',
          'user-creator',
          'nonexistent',
          ParticipationRole.MEMBER,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeParticipant', () => {
    beforeEach(() => {
      mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
      mockPrisma.participation.findUnique.mockResolvedValue(
        mockMemberParticipation,
      );
      mockPrisma.expenseDetail.findMany.mockResolvedValue([]);
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.participation.delete.mockResolvedValue(mockMemberParticipation);
    });

    it('should remove a participant with zero balance', async () => {
      await service.removeParticipant('trip-1', 'user-creator', 'user-member');

      expect(mockPrisma.participation.delete).toHaveBeenCalledWith({
        where: {
          userId_tripId: { userId: 'user-member', tripId: 'trip-1' },
        },
      });
    });

    it('should throw ConflictException if balance is not zero', async () => {
      mockPrisma.expenseDetail.findMany.mockResolvedValue([
        { amountPaid: new Decimal(100), amountOwed: new Decimal(50) },
      ]);

      await expect(
        service.removeParticipant('trip-1', 'user-creator', 'user-member'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if target is CREATOR', async () => {
      mockPrisma.participation.findUnique.mockResolvedValue(
        mockCreatorParticipation,
      );

      await expect(
        service.removeParticipant('trip-1', 'user-creator', 'user-creator'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('leaveTrip', () => {
    beforeEach(() => {
      mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
      mockPrisma.participation.findUnique.mockResolvedValue(
        mockMemberParticipation,
      );
      mockPrisma.expenseDetail.findMany.mockResolvedValue([]);
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.participation.delete.mockResolvedValue(mockMemberParticipation);
    });

    it('should allow a member to leave with zero balance', async () => {
      await service.leaveTrip('trip-1', 'user-member');

      expect(mockPrisma.participation.delete).toHaveBeenCalledWith({
        where: {
          userId_tripId: { userId: 'user-member', tripId: 'trip-1' },
        },
      });
    });

    it('should throw BadRequestException if CREATOR tries to leave', async () => {
      mockPrisma.participation.findUnique.mockResolvedValue(
        mockCreatorParticipation,
      );

      await expect(
        service.leaveTrip('trip-1', 'user-creator'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if balance is not zero', async () => {
      mockPrisma.expenseDetail.findMany.mockResolvedValue([
        { amountPaid: new Decimal(100), amountOwed: new Decimal(0) },
      ]);

      await expect(
        service.leaveTrip('trip-1', 'user-member'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException if not a participant', async () => {
      mockPrisma.participation.findUnique.mockResolvedValue(null);

      await expect(
        service.leaveTrip('trip-1', 'non-participant'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
