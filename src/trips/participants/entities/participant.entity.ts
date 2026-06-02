import { ApiProperty } from '@nestjs/swagger';
import { ParticipationRole } from '@prisma/client';
import { UserPublicEntity } from '../../entities/trip.entity';

export class ParticipantEntity {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  userId: string;

  @ApiProperty({ format: 'uuid' })
  tripId: string;

  @ApiProperty({ enum: ParticipationRole, example: ParticipationRole.MEMBER })
  role: ParticipationRole;

  @ApiProperty({
    example: '0.00',
    description:
      'Balance neto del participante en el viaje. Decimal serializado como string.',
  })
  currentBalance: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z', format: 'date-time' })
  joinedAt: string;

  @ApiProperty({ type: () => UserPublicEntity })
  user: UserPublicEntity;
}
