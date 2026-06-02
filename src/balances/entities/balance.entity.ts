import { ApiProperty } from '@nestjs/swagger';

export class BalanceEntryEntity {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 'Enrique Seitz' })
  userName!: string;

  @ApiProperty({
    example: '150.00',
    description: 'Net balance in base currency. Positive = others owe them. Negative = they owe others.',
  })
  balance!: string;
}

export class SettlementSuggestionEntity {
  @ApiProperty({ format: 'uuid' })
  fromUserId!: string;

  @ApiProperty({ example: 'Juan Perez' })
  fromUserName!: string;

  @ApiProperty({ format: 'uuid' })
  toUserId!: string;

  @ApiProperty({ example: 'Maria Lopez' })
  toUserName!: string;

  @ApiProperty({ example: '75.00' })
  amount!: string;
}
