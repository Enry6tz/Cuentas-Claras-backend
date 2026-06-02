import { ApiProperty } from '@nestjs/swagger';
import { UserPublicEntity } from '../../trips/entities/trip.entity';

export class ExpenseDetailEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  expenseId!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: '50.00', description: 'Amount paid by this user' })
  amountPaid!: string;

  @ApiProperty({ example: '25.00', description: 'Amount owed by this user' })
  amountOwed!: string;

  @ApiProperty({ type: () => UserPublicEntity, required: false })
  user?: UserPublicEntity;
}
