import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class ExpenseQueryDto {
  @ApiPropertyOptional({ description: 'Filter by date from (inclusive)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter by date to (inclusive)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
