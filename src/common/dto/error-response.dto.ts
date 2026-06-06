import { ApiProperty } from '@nestjs/swagger';

/**
 * Detalle del error de negocio.
 *
 * `code` identifica el error en SNAKE_UPPER_CASE (ej. TRIP_NOT_FOUND) para que
 * el cliente pueda reaccionar sin parsear el `message`, que es legible para humanos.
 */
export class ErrorDetailDto {
  @ApiProperty({
    example: 'TRIP_NOT_FOUND',
    description: 'Codigo de negocio en SNAKE_UPPER_CASE.',
  })
  code!: string;

  @ApiProperty({
    example: 'Trip not found',
    description: 'Mensaje legible para humanos / desarrollador.',
  })
  message!: string;

  @ApiProperty({
    required: false,
    description:
      'Informacion adicional opcional. En errores de validacion contiene el ' +
      'array de mensajes de cada campo.',
    example: ['name should not be empty'],
  })
  details?: unknown;
}

/**
 * Forma estandar de TODOS los errores que devuelve la API (Entregable 4).
 *
 *   { "error": { "code": "TRIP_NOT_FOUND", "message": "Trip not found", "details": ... } }
 *
 * La produce el filtro global `AllExceptionsFilter`
 * (src/common/filters/all-exceptions.filter.ts). Documentamos esta DTO una sola
 * vez y la reutilizamos en cada `@ApiResponse({ status: 4xx/5xx, type: ErrorResponseDto })`.
 */
export class ErrorResponseDto {
  @ApiProperty({ type: ErrorDetailDto })
  error!: ErrorDetailDto;
}
