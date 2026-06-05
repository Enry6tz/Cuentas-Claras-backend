import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseSplitType } from '@prisma/client';

export class CreateExpensePayerDto {
  @ApiProperty({ description: 'User who paid', format: 'uuid' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: 100, description: 'Amount paid by this user' })
  @IsNumber()
  @Min(0)
  amountPaid!: number;
}

export class CreateExpenseExactShareDto {
  @ApiProperty({ description: 'User who owes', format: 'uuid' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: 50, description: 'Exact amount owed (in base currency)' })
  @IsNumber()
  @Min(0)
  amountOwed!: number;
}

export class CreateExpensePercentShareDto {
  @ApiProperty({ description: 'User who owes', format: 'uuid' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: 25, description: 'Percentage of total owed' })
  @IsNumber()
  @Min(0)
  percent!: number;
}

export class CreateExpenseDto {
  @ApiProperty({ example: 'Cena en el restaurante' })
  @IsString()
  @MaxLength(500)
  description!: string;

  @ApiProperty({ example: 100, description: 'Original amount in the original currency' })
  @IsNumber()
  @Min(0.01)
  originalAmount!: number;

  @ApiProperty({ example: 'USD', description: 'ISO 4217 currency code' })
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  originalCurrency!: string;

  @ApiPropertyOptional({ example: '2026-07-15' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 'Comida' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiProperty({ enum: ExpenseSplitType, example: ExpenseSplitType.EQUAL })
  @IsEnum(ExpenseSplitType)
  splitType!: ExpenseSplitType;

  @ApiProperty({
    description: 'Who paid and how much. Sum of amountPaid must equal originalAmount.',
    type: [CreateExpensePayerDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExpensePayerDto)
  @ArrayMinSize(1)
  payers!: CreateExpensePayerDto[];

  @ApiPropertyOptional({
    description: 'Required for EQUAL: participants in the split.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  participantIds?: string[];

  @ApiPropertyOptional({
    description: 'Required for EXACT: exact amounts owed per user.',
    type: [CreateExpenseExactShareDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExpenseExactShareDto)
  exactShares?: CreateExpenseExactShareDto[];

  @ApiPropertyOptional({
    description: 'Required for PERCENT: percentages owed per user. Must sum to 100.',
    type: [CreateExpensePercentShareDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExpensePercentShareDto)
  percentShares?: CreateExpensePercentShareDto[];

  @ApiPropertyOptional({
    description: 'Manual exchange rate override. Only used if originalCurrency != baseCurrency and API fails.',
    example: 1200.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  manualExchangeRate?: number;
}
