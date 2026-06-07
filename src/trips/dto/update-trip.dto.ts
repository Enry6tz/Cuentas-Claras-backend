import { PartialType } from '@nestjs/swagger';
import { CreateTripDto } from './create-trip.dto';

/**
 * `PartialType(CreateTripDto)` toma todos los campos del DTO de creacion
 * y los marca como opcionales. Asi para un PATCH el cliente puede mandar
 * solo los campos que quiere modificar (por ejemplo, solo `name`).
 *
 * Para finalizar un viaje usa POST /trips/:id/finalize en lugar de PATCH.
 */
export class UpdateTripDto extends PartialType(CreateTripDto) {}
