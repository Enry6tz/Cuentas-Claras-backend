import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/** Filtros + paginación para GET /me/expenses (gastos del usuario en todos sus viajes). */
export class QueryMyExpensesDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Número de página (1-based)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100, description: 'Tamaño de página' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number = 10;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filtrar por un viaje puntual' })
  @IsUUID()
  @IsOptional()
  tripId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por categoría' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Busca en la descripción del gasto' })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ format: 'date', description: 'Desde (inclusive), YYYY-MM-DD' })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ format: 'date', description: 'Hasta (inclusive), YYYY-MM-DD' })
  @IsDateString()
  @IsOptional()
  to?: string;
}
