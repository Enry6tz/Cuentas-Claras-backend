import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvitationStatus, ParticipationRole, TripStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Datos públicos del usuario que exponemos en las respuestas (igual que en
// participants.service.ts: nunca leakeamos clerkId ni timestamps internos).
const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
} as const;

const TRIP_SUMMARY_SELECT = {
  id: true,
  name: true,
  description: true,
  baseCurrency: true,
  status: true,
} as const;

@Injectable()
export class InvitationsService {
  constructor(private prisma: PrismaService) {}

  /** El CREATOR invita a un usuario registrado con un rol concreto. */
  async createInvitation(
    tripId: string,
    actorId: string,
    inviteeId: string,
    role: ParticipationRole,
  ) {
    await this.assertTripExists(tripId);
    await this.assertTripActive(tripId);
    await this.assertIsCreator(tripId, actorId);

    if (role === ParticipationRole.CREATOR) {
      throw new BadRequestException('No puedes invitar con el rol de creador');
    }

    const invitee = await this.prisma.user.findUnique({
      where: { id: inviteeId },
    });
    if (!invitee) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const existingParticipation = await this.prisma.participation.findUnique({
      where: { userId_tripId: { userId: inviteeId, tripId } },
    });
    if (existingParticipation) {
      throw new ConflictException('El usuario ya participa en este viaje');
    }

    const existingInvitation = await this.prisma.invitation.findFirst({
      where: { tripId, inviteeId, status: InvitationStatus.PENDING },
    });
    if (existingInvitation) {
      throw new ConflictException(
        'Ya existe una invitación pendiente para este usuario',
      );
    }

    return this.prisma.invitation.create({
      data: { tripId, inviterId: actorId, inviteeId, role },
      include: {
        invitee: { select: PUBLIC_USER_SELECT },
        inviter: { select: PUBLIC_USER_SELECT },
      },
    });
  }

  /** Invitaciones de un viaje (para que el CREATOR las gestione). */
  async findByTrip(tripId: string) {
    await this.assertTripExists(tripId);

    return this.prisma.invitation.findMany({
      where: { tripId },
      orderBy: { createdAt: 'desc' },
      include: {
        invitee: { select: PUBLIC_USER_SELECT },
        inviter: { select: PUBLIC_USER_SELECT },
      },
    });
  }

  /** Invitaciones pendientes recibidas por el usuario autenticado. */
  async findForUser(userId: string) {
    return this.prisma.invitation.findMany({
      where: { inviteeId: userId, status: InvitationStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      include: {
        inviter: { select: PUBLIC_USER_SELECT },
        trip: { select: TRIP_SUMMARY_SELECT },
      },
    });
  }

  /** El receptor acepta: se crea la Participation con el rol de la invitación. */
  async accept(invitationId: string, userId: string) {
    const invitation = await this.getOwnedPendingInvitation(
      invitationId,
      userId,
    );
    await this.assertTripExists(invitation.tripId);
    await this.assertTripActive(invitation.tripId);

    const existingParticipation = await this.prisma.participation.findUnique({
      where: { userId_tripId: { userId, tripId: invitation.tripId } },
    });
    if (existingParticipation) {
      throw new ConflictException('Ya participas en este viaje');
    }

    // En una transacción: marcar la invitación como aceptada y crear la
    // participación, así nunca queda una sin la otra.
    return this.prisma.$transaction(async (tx) => {
      await tx.invitation.update({
        where: { id: invitationId },
        data: { status: InvitationStatus.ACCEPTED, respondedAt: new Date() },
      });

      return tx.participation.create({
        data: { userId, tripId: invitation.tripId, role: invitation.role },
        include: { user: { select: PUBLIC_USER_SELECT } },
      });
    });
  }

  /** El receptor rechaza la invitación. */
  async reject(invitationId: string, userId: string) {
    await this.getOwnedPendingInvitation(invitationId, userId);

    return this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.REJECTED, respondedAt: new Date() },
    });
  }

  /** El CREATOR cancela una invitación pendiente que envió. */
  async cancel(tripId: string, actorId: string, invitationId: string) {
    await this.assertTripExists(tripId);
    await this.assertIsCreator(tripId, actorId);

    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation || invitation.tripId !== tripId) {
      throw new NotFoundException('Invitación no encontrada');
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('La invitación ya no está pendiente');
    }

    return this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.CANCELLED, respondedAt: new Date() },
    });
  }

  /**
   * Carga una invitación garantizando que pertenece al usuario y que sigue
   * pendiente. Se usa en accept/reject.
   */
  private async getOwnedPendingInvitation(
    invitationId: string,
    userId: string,
  ) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }
    if (invitation.inviteeId !== userId) {
      throw new ForbiddenException('Esta invitación no es para ti');
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('La invitación ya no está pendiente');
    }
    return invitation;
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
