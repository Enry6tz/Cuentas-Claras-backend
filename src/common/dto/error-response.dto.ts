import { ApiProperty } from '@nestjs/swagger';

/**
 * Forma estandar de un error que devuelve la API.
 *
 * NestJS por default serializa las HttpException como:
 *   { "statusCode": 404, "message": "...", "error": "..." }
 *
 * El PrismaExceptionFilter global (src/common/filters/prisma-exception.filter.ts)
 * genera respuestas con la misma forma.
 *
 * Documentamos esta DTO una sola vez y la reutilizamos en cada
 * `@ApiResponse({ status: 4xx, type: ErrorResponseDto })` del proyecto.
 */
export class ErrorResponseDto {
  @ApiProperty({ example: 404, description: 'HTTP status code' })
  statusCode!: number;

  @ApiProperty({
    example: 'Trip not found',
    description: 'Mensaje legible para humanos / dev. Puede ser string o array de strings (validation errors).',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  message!: string | string[];

  @ApiProperty({
    example: 'Not Found',
    required: false,
    description: 'Nombre corto del error (lo agrega NestJS en HttpException standard).',
  })
  error?: string;
}
