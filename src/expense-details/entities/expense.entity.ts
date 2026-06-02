import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseSplitType } from '@prisma/client';
import { ExpenseDetailEntity } from './expense-detail.entity';
import { UserPublicEntity } from '../../trips/entities/trip.entity';

export class ExpenseEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  creatorId!: string;

  @ApiProperty({ format: 'uuid' })
  tripId!: string;

  @ApiPropertyOptional({ example: 'Cena en el restaurante' })
  description!: string | null;

  @ApiProperty({ example: '100.00' })
  originalAmount!: string;

  @ApiProperty({ example: 'USD' })
  originalCurrency!: string;

  @ApiPropertyOptional({ example: '1200.50', description: 'Snapshot exchange rate' })
  exchangeRate!: string | null;

  @ApiPropertyOptional({ example: '120050.00', description: 'Converted amount in base currency' })
  baseAmount!: string | null;

  @ApiProperty({ enum: ExpenseSplitType, example: ExpenseSplitType.EQUAL })
  splitType!: ExpenseSplitType;

  @ApiProperty({ example: '2026-07-15T00:00:00.000Z', format: 'date-time' })
  date!: string;

  @ApiPropertyOptional({ example: 'Comida' })
  category!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ type: () => [ExpenseDetailEntity], required: false })
  details?: ExpenseDetailEntity[];

  @ApiProperty({ type: () => UserPublicEntity, required: false })
  creator?: UserPublicEntity;
}
