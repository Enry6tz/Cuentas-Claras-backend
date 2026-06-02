import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ description: 'User who pays (debtor)', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  debtorId!: string;

  @ApiProperty({ description: 'User who receives (creditor)', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  creditorId!: string;

  @ApiProperty({ example: 100, description: 'Amount in trip base currency' })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ example: 'Pago de la cena' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ example: '2026-07-15' })
  @IsOptional()
  @IsDateString()
  date?: string;
}
