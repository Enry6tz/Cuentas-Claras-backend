import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvitationStatus, TripStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvitationsService {
  constructor(private prisma: PrismaService) {}

  async create(tripId: string, invitedById: string, invitedUserId: string) {
    await this.assertTripActive(tripId);
    await this.assertInviterIsCreator(tripId, invitedById);

    const userExists = await this.prisma.user.findUnique({
      where: { id: invitedUserId },
    });
    if (!userExists) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const existingParticipation =
      await this.prisma.participation.findUnique({
        where: { userId_tripId: { userId: invitedUserId, tripId } },
      });
    if (existingParticipation) {
      throw new ConflictException('El usuario ya participa en este viaje');
    }

    const existingInvitation = await this.prisma.invitation.findUnique({
      where: { tripId_invitedId: { tripId, invitedId: invitedUserId } },
    });
    if (existingInvitation && existingInvitation.status === InvitationStatus.PENDING) {
      throw new ConflictException('Ya hay una invitación pendiente para este usuario');
    }

    if (existingInvitation) {
      return this.prisma.invitation.update({
        where: { id: existingInvitation.id },
        data: { status: InvitationStatus.PENDING, invitedBy: invitedById },
        include: {
          invited: { select: { id: true, name: true, email: true, avatarUrl: true } },
          inviter: { select: { id: true, name: true, email: true } },
          trip: { select: { id: true, name: true } },
        },
      });
    }

    return this.prisma.invitation.create({
      data: {
        tripId,
        invitedId: invitedUserId,
        invitedBy: invitedById,
        status: InvitationStatus.PENDING,
      },
      include: {
        invited: { select: { id: true, name: true, email: true, avatarUrl: true } },
        inviter: { select: { id: true, name: true, email: true } },
        trip: { select: { id: true, name: true } },
      },
    });
  }

  async findPendingForUser(userId: string) {
    return this.prisma.invitation.findMany({
      where: {
        invitedId: userId,
        status: InvitationStatus.PENDING,
        trip: { deletedAt: null },
      },
      include: {
        trip: { select: { id: true, name: true, baseCurrency: true } },
        inviter: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async accept(invitationId: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }

    if (invitation.invitedId !== userId) {
      throw new ForbiddenException('Esta invitación no te pertenece');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        invitation.status === InvitationStatus.ACCEPTED
          ? 'Ya aceptaste esta invitación'
          : 'Esta invitación fue rechazada',
      );
    }

    const trip = await this.prisma.trip.findUnique({
      where: { id: invitation.tripId },
    });
    if (!trip || trip.deletedAt || trip.status === TripStatus.FINALIZED) {
      throw new BadRequestException('El viaje ya no está activo');
    }

    const existingParticipation =
      await this.prisma.participation.findUnique({
        where: { userId_tripId: { userId, tripId: invitation.tripId } },
      });
    if (existingParticipation) {
      throw new ConflictException('Ya eres participante de este viaje');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.invitation.update({
        where: { id: invitationId },
        data: { status: InvitationStatus.ACCEPTED },
      });

      return tx.participation.create({
        data: {
          userId,
          tripId: invitation.tripId,
          role: 'MEMBER',
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          trip: {
            select: { id: true, name: true },
          },
        },
      });
    });
  }

  async decline(invitationId: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }

    if (invitation.invitedId !== userId) {
      throw new ForbiddenException('Esta invitación no te pertenece');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        invitation.status === InvitationStatus.ACCEPTED
          ? 'Ya aceptaste esta invitación'
          : 'Ya rechazaste esta invitación',
      );
    }

    return this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.DECLINED },
    });
  }

  async cancel(tripId: string, invitationId: string, actorId: string) {
    await this.assertInviterIsCreator(tripId, actorId);

    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.tripId !== tripId) {
      throw new NotFoundException('Invitación no encontrada');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Solo se pueden cancelar invitaciones pendientes');
    }

    await this.prisma.invitation.delete({
      where: { id: invitationId },
    });
  }

  async findByTrip(tripId: string) {
    return this.prisma.invitation.findMany({
      where: { tripId },
      include: {
        invited: { select: { id: true, name: true, email: true, avatarUrl: true } },
        inviter: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async assertTripActive(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });
    if (!trip || trip.deletedAt) {
      throw new NotFoundException('Viaje no encontrado');
    }
    if (trip.status === TripStatus.FINALIZED) {
      throw new BadRequestException('El viaje está finalizado');
    }
  }

  private async assertInviterIsCreator(tripId: string, userId: string) {
    const participation = await this.prisma.participation.findUnique({
      where: { userId_tripId: { userId, tripId } },
    });
    if (!participation) {
      throw new ForbiddenException('No eres participante de este viaje');
    }
    if (participation.role !== 'CREATOR') {
      throw new ForbiddenException(
        'Solo el creador del viaje puede invitar personas',
      );
    }
  }
}
