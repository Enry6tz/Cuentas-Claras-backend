import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO = Data Transfer Object.
 *
 * En NestJS, los DTOs definen "qué campos puede mandar el cliente" en el body
 * de un POST/PATCH. Los decoradores de class-validator (`@IsString`, `@IsNotEmpty`,
 * etc.) hacen que el ValidationPipe global rechace requests con datos invalidos
 * ANTES de que lleguen al controller — devuelve 400 Bad Request automaticamente.
 *
 * Los decoradores de @nestjs/swagger (`@ApiProperty`) generan la documentacion
 * de Swagger en /api.
 *
 * Como tenemos `whitelist: true` en main.ts, cualquier campo que el cliente
 * mande y NO este declarado aca, se descarta silenciosamente. Es una proteccion
 * contra "mass assignment" (que el cliente intente setear un `currentBalance`
 * arbitrario, por ejemplo).
 */
export class CreateTripDto {
  @ApiProperty({ example: 'Bariloche 2026', description: 'Nombre del viaje' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'Semana en Bariloche con los chicos' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  // Fechas como ISO string (ej. "2026-07-15"). El @IsDateString valida formato.
  // Despues en el service lo parseamos a Date con `new Date(...)`.
  @ApiPropertyOptional({ example: '2026-07-15', description: 'ISO date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-07-22', description: 'ISO date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  // Codigo de divisa ISO 4217 (3 letras). BR03: cada trip tiene una baseCurrency
  // y todos los reportes/balances se expresan en esa moneda.
  @ApiProperty({ example: 'ARS', description: 'ISO 4217 currency code (3 letters)' })
  @IsString()
  @Length(3, 3)
  baseCurrency!: string;

  // Apariencia: ids 1..30 que el front mapea a un emoji y un color.
  @ApiPropertyOptional({ example: 1, minimum: 1, maximum: 30, description: 'Id del emoji (1..30)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  iconId?: number;

  @ApiPropertyOptional({ example: 1, minimum: 1, maximum: 30, description: 'Id del color (1..30)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  colorId?: number;
}
