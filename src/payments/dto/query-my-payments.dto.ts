import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/** Filtros + paginación para GET /me/payments (pagos del usuario en todos sus viajes). */
export class QueryMyPaymentsDto {
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

  @ApiPropertyOptional({
    enum: ['debtor', 'creditor'],
    description:
      'Acota a pagos donde el usuario es deudor (pagó) o acreedor (cobró). Sin valor: todos los pagos de sus viajes.',
  })
  @IsIn(['debtor', 'creditor'])
  @IsOptional()
  role?: 'debtor' | 'creditor';

  @ApiPropertyOptional({ description: 'Busca en la nota del pago' })
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
