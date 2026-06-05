import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  InvitationStatus,
  ParticipationRole,
  TripStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { InvitationsService } from './invitations.service';

describe('InvitationsService', () => {
  let service: InvitationsService;

  const mockTrip = {
    id: 'trip-1',
    name: 'Test Trip',
    status: TripStatus.ACTIVE,
    deletedAt: null,
  };

  const mockInvitee = {
    id: 'user-invitee',
    name: 'Jane',
    email: 'jane@test.com',
  };

  const mockCreatorParticipation = {
    id: 'part-1',
    userId: 'user-creator',
    tripId: 'trip-1',
    role: ParticipationRole.CREATOR,
    currentBalance: new Decimal(0),
    joinedAt: new Date(),
  };

  const mockMemberParticipation = {
    id: 'part-2',
    userId: 'user-invitee',
    tripId: 'trip-1',
    role: ParticipationRole.MEMBER,
    currentBalance: new Decimal(0),
    joinedAt: new Date(),
  };

  const mockPendingInvitation = {
    id: 'inv-1',
    tripId: 'trip-1',
    inviterId: 'user-creator',
    inviteeId: 'user-invitee',
    role: ParticipationRole.MEMBER,
    status: InvitationStatus.PENDING,
    createdAt: new Date(),
    respondedAt: null,
  };

  const mockPrisma = {
    trip: {
      findUnique: jest.fn(),
    },
    participation: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    invitation: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
    jest.clearAllMocks();
    // Por defecto la transacción ejecuta el callback con el mismo mock.
    mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockPrisma));
  });

  describe('createInvitation', () => {
    beforeEach(() => {
      mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
      // assertIsCreator(actor) ve al CREATOR; el invitee aún no participa.
      mockPrisma.participation.findUnique.mockImplementation(({ where }) => {
        const uid = where.userId_tripId.userId;
        if (uid === 'user-creator') {
          return Promise.resolve(mockCreatorParticipation);
        }
        return Promise.resolve(null);
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockInvitee);
      mockPrisma.invitation.findFirst.mockResolvedValue(null);
      mockPrisma.invitation.create.mockResolvedValue(mockPendingInvitation);
    });

    it('should create a PENDING invitation with the given role', async () => {
      const result = await service.createInvitation(
        'trip-1',
        'user-creator',
        'user-invitee',
        ParticipationRole.SUPERVISOR,
      );

      expect(result).toEqual(mockPendingInvitation);
      expect(mockPrisma.invitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            tripId: 'trip-1',
            inviterId: 'user-creator',
            inviteeId: 'user-invitee',
            role: ParticipationRole.SUPERVISOR,
          },
        }),
      );
    });

    it('should throw BadRequestException when inviting with CREATOR role', async () => {
      await expect(
        service.createInvitation(
          'trip-1',
          'user-creator',
          'user-invitee',
          ParticipationRole.CREATOR,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if actor is not CREATOR', async () => {
      mockPrisma.participation.findUnique.mockResolvedValue({
        ...mockMemberParticipation,
        userId: 'user-member',
      });

      await expect(
        service.createInvitation(
          'trip-1',
          'user-member',
          'user-invitee',
          ParticipationRole.MEMBER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if invitee does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createInvitation(
          'trip-1',
          'user-creator',
          'nonexistent',
          ParticipationRole.MEMBER,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if invitee is already a participant', async () => {
      mockPrisma.participation.findUnique.mockImplementation(({ where }) => {
        const uid = where.userId_tripId.userId;
        if (uid === 'user-creator') {
          return Promise.resolve(mockCreatorParticipation);
        }
        if (uid === 'user-invitee') {
          return Promise.resolve(mockMemberParticipation);
        }
        return Promise.resolve(null);
      });

      await expect(
        service.createInvitation(
          'trip-1',
          'user-creator',
          'user-invitee',
          ParticipationRole.MEMBER,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if a PENDING invitation already exists', async () => {
      mockPrisma.invitation.findFirst.mockResolvedValue(mockPendingInvitation);

      await expect(
        service.createInvitation(
          'trip-1',
          'user-creator',
          'user-invitee',
          ParticipationRole.MEMBER,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if trip is FINALIZED', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({
        ...mockTrip,
        status: TripStatus.FINALIZED,
      });

      await expect(
        service.createInvitation(
          'trip-1',
          'user-creator',
          'user-invitee',
          ParticipationRole.MEMBER,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByTrip', () => {
    it('should return the invitations of a trip', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
      mockPrisma.invitation.findMany.mockResolvedValue([mockPendingInvitation]);

      const result = await service.findByTrip('trip-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.invitation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tripId: 'trip-1' } }),
      );
    });

    it('should throw NotFoundException when the trip does not exist', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(null);

      await expect(service.findByTrip('trip-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findForUser', () => {
    it('should return only the PENDING invitations of the user', async () => {
      mockPrisma.invitation.findMany.mockResolvedValue([mockPendingInvitation]);

      const result = await service.findForUser('user-invitee');

      expect(result).toHaveLength(1);
      expect(mockPrisma.invitation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            inviteeId: 'user-invitee',
            status: InvitationStatus.PENDING,
          },
        }),
      );
    });
  });

  describe('accept', () => {
    beforeEach(() => {
      mockPrisma.invitation.findUnique.mockResolvedValue(mockPendingInvitation);
      mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
      mockPrisma.participation.findUnique.mockResolvedValue(null);
      mockPrisma.invitation.update.mockResolvedValue({
        ...mockPendingInvitation,
        status: InvitationStatus.ACCEPTED,
      });
      mockPrisma.participation.create.mockResolvedValue(mockMemberParticipation);
    });

    it('should create a Participation with the invitation role and mark it ACCEPTED', async () => {
      const result = await service.accept('inv-1', 'user-invitee');

      expect(result).toEqual(mockMemberParticipation);
      expect(mockPrisma.invitation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          data: expect.objectContaining({
            status: InvitationStatus.ACCEPTED,
          }),
        }),
      );
      expect(mockPrisma.participation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            userId: 'user-invitee',
            tripId: 'trip-1',
            role: ParticipationRole.MEMBER,
          },
        }),
      );
    });

    it('should throw ForbiddenException if invitation belongs to another user', async () => {
      await expect(service.accept('inv-1', 'someone-else')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if invitation does not exist', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(null);

      await expect(service.accept('inv-1', 'user-invitee')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if invitation is not PENDING', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue({
        ...mockPendingInvitation,
        status: InvitationStatus.REJECTED,
      });

      await expect(service.accept('inv-1', 'user-invitee')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException if user already participates', async () => {
      mockPrisma.participation.findUnique.mockResolvedValue(
        mockMemberParticipation,
      );

      await expect(service.accept('inv-1', 'user-invitee')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if the trip is FINALIZED', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({
        ...mockTrip,
        status: TripStatus.FINALIZED,
      });

      await expect(service.accept('inv-1', 'user-invitee')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if the trip was deleted', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({
        ...mockTrip,
        deletedAt: new Date(),
      });

      await expect(service.accept('inv-1', 'user-invitee')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reject', () => {
    beforeEach(() => {
      mockPrisma.invitation.findUnique.mockResolvedValue(mockPendingInvitation);
      mockPrisma.invitation.update.mockResolvedValue({
        ...mockPendingInvitation,
        status: InvitationStatus.REJECTED,
      });
    });

    it('should mark the invitation as REJECTED', async () => {
      const result = await service.reject('inv-1', 'user-invitee');

      expect(result.status).toBe(InvitationStatus.REJECTED);
      expect(mockPrisma.invitation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          data: expect.objectContaining({
            status: InvitationStatus.REJECTED,
          }),
        }),
      );
    });

    it('should throw ForbiddenException if invitation belongs to another user', async () => {
      await expect(service.reject('inv-1', 'someone-else')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if the invitation does not exist', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(null);

      await expect(service.reject('inv-1', 'user-invitee')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if the invitation is not PENDING', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue({
        ...mockPendingInvitation,
        status: InvitationStatus.CANCELLED,
      });

      await expect(service.reject('inv-1', 'user-invitee')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancel', () => {
    beforeEach(() => {
      mockPrisma.trip.findUnique.mockResolvedValue(mockTrip);
      mockPrisma.participation.findUnique.mockResolvedValue(
        mockCreatorParticipation,
      );
      mockPrisma.invitation.findUnique.mockResolvedValue(mockPendingInvitation);
      mockPrisma.invitation.update.mockResolvedValue({
        ...mockPendingInvitation,
        status: InvitationStatus.CANCELLED,
      });
    });

    it('should mark the invitation as CANCELLED', async () => {
      const result = await service.cancel('trip-1', 'user-creator', 'inv-1');

      expect(result.status).toBe(InvitationStatus.CANCELLED);
    });

    it('should throw NotFoundException if invitation is from another trip', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue({
        ...mockPendingInvitation,
        tripId: 'other-trip',
      });

      await expect(
        service.cancel('trip-1', 'user-creator', 'inv-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if invitation is not PENDING', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue({
        ...mockPendingInvitation,
        status: InvitationStatus.ACCEPTED,
      });

      await expect(
        service.cancel('trip-1', 'user-creator', 'inv-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if actor is not CREATOR', async () => {
      mockPrisma.participation.findUnique.mockResolvedValue(
        mockMemberParticipation,
      );

      await expect(
        service.cancel('trip-1', 'user-member', 'inv-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if the trip does not exist', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(null);

      await expect(
        service.cancel('trip-1', 'user-creator', 'inv-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
