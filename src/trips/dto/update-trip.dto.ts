import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { TripStatus } from '@prisma/client';
import { CreateTripDto } from './create-trip.dto';

/**
 * `PartialType(CreateTripDto)` toma todos los campos del DTO de creacion
 * y los marca como opcionales. Asi para un PATCH el cliente puede mandar
 * solo los campos que quiere modificar (por ejemplo, solo `name`).
 *
 * Ademas agregamos `status` que NO esta en el create (un trip nace siempre
 * en ACTIVE) pero si puede actualizarse (ej. cerrarlo a FINALIZED).
 */
export class UpdateTripDto extends PartialType(CreateTripDto) {
  @ApiPropertyOptional({
    enum: TripStatus,
    description: 'ACTIVE = acepta gastos/pagos. FINALIZED = solo lectura.',
  })
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;
}
