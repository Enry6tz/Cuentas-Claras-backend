import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvitationStatus } from '@prisma/client';

class InvitationUserEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  avatarUrl?: string;
}

class InvitationTripEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  baseCurrency?: string;
}

export class InvitationEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  tripId!: string;

  @ApiProperty({ format: 'uuid' })
  invitedId!: string;

  @ApiProperty({ format: 'uuid' })
  invitedBy!: string;

  @ApiProperty({ enum: InvitationStatus, example: InvitationStatus.PENDING })
  status!: InvitationStatus;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiPropertyOptional({ type: () => InvitationUserEntity })
  invited?: InvitationUserEntity;

  @ApiPropertyOptional({ type: () => InvitationUserEntity })
  inviter?: InvitationUserEntity;

  @ApiPropertyOptional({ type: () => InvitationTripEntity })
  trip?: InvitationTripEntity;
}
