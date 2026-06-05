import { ApiProperty } from '@nestjs/swagger';
import { InvitationStatus, ParticipationRole } from '@prisma/client';
import { TripEntity, UserPublicEntity } from '../../entities/trip.entity';

export class InvitationEntity {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  tripId: string;

  @ApiProperty({ format: 'uuid' })
  inviterId: string;

  @ApiProperty({ format: 'uuid' })
  inviteeId: string;

  @ApiProperty({ enum: ParticipationRole, example: ParticipationRole.MEMBER })
  role: ParticipationRole;

  @ApiProperty({ enum: InvitationStatus, example: InvitationStatus.PENDING })
  status: InvitationStatus;

  @ApiProperty({ example: '2026-06-05T18:42:00.000Z', format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time', nullable: true })
  respondedAt: string | null;

  // Presentes según el endpoint (include de relaciones).
  @ApiProperty({ type: () => UserPublicEntity, required: false })
  inviter?: UserPublicEntity;

  @ApiProperty({ type: () => UserPublicEntity, required: false })
  invitee?: UserPublicEntity;

  @ApiProperty({ type: () => TripEntity, required: false })
  trip?: TripEntity;
}
