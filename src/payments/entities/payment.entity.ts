import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserPublicEntity } from '../../trips/entities/trip.entity';

export class PaymentEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  debtorId!: string;

  @ApiProperty({ format: 'uuid' })
  creditorId!: string;

  @ApiProperty({ format: 'uuid' })
  tripId!: string;

  @ApiProperty({ example: '100.00' })
  amount!: string;

  @ApiPropertyOptional({ example: 'Pago de la cena' })
  note!: string | null;

  @ApiProperty({ example: '2026-07-15T00:00:00.000Z', format: 'date-time' })
  date!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: () => UserPublicEntity, required: false })
  debtor?: UserPublicEntity;

  @ApiProperty({ type: () => UserPublicEntity, required: false })
  creditor?: UserPublicEntity;
}
