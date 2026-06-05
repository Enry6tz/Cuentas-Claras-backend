import { ApiProperty } from '@nestjs/swagger';
import { ParticipationRole, TripStatus } from '@prisma/client';

/**
 * Entity classes = el "shape" de las respuestas que va a recibir el cliente.
 *
 * NO son las tablas de Prisma directamente — son la *vista publica*. Por eso
 * por ejemplo en `UserPublicEntity` solo exponemos id/name/email/avatarUrl
 * (no leakeamos clerkId ni timestamps internos).
 *
 * Los decoradores @ApiProperty alimentan el JSON Schema que va a Swagger,
 * de forma que en /api se muestren los campos, tipos, ejemplos, descripciones.
 *
 * Importante sobre Decimals y Dates:
 *   - Los `@db.Decimal(...)` de Prisma se serializan como STRING en JSON
 *     (para no perder precision), por eso `currentBalance` lo tipamos como string.
 *   - Los `DateTime` se serializan como STRING ISO 8601.
 */

export class UserPublicEntity {
  @ApiProperty({
    example: 'b3f8c2e1-4a5d-4f7e-8c6d-9e0f1a2b3c4d',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ example: 'Enrique Seitz' })
  name!: string;

  @ApiProperty({ example: 'enrique@example.com' })
  email!: string;

  @ApiProperty({
    example: 'https://img.clerk.com/abc123.jpeg',
    nullable: true,
    required: false,
  })
  avatarUrl!: string | null;
}

export class ParticipationEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  tripId!: string;

  @ApiProperty({ enum: ParticipationRole, example: ParticipationRole.MEMBER })
  role!: ParticipationRole;

  @ApiProperty({
    example: '0.00',
    description:
      'Balance neto del participante en el trip, en la baseCurrency del trip. Decimal serializado como string. Positivo = le deben. Negativo = debe.',
  })
  currentBalance!: string;

  @ApiProperty({ example: '2026-05-03T18:42:00.000Z', format: 'date-time' })
  joinedAt!: string;

  // Solo viene cuando el endpoint hace include del user
  // (findOne, create devuelven con esto; findAllForUser no).
  @ApiProperty({ type: () => UserPublicEntity, required: false })
  user?: UserPublicEntity;
}

export class TripCountEntity {
  @ApiProperty({ example: 4 })
  participations!: number;

  @ApiProperty({ example: 12 })
  expenses!: number;
}

export class TripEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Bariloche 2026' })
  name!: string;

  @ApiProperty({ example: 'Semana en Bariloche con los chicos', nullable: true })
  description!: string | null;

  @ApiProperty({
    example: '2026-07-15',
    format: 'date',
    nullable: true,
  })
  startDate!: string | null;

  @ApiProperty({ example: '2026-07-22', format: 'date', nullable: true })
  endDate!: string | null;

  @ApiProperty({ example: 'ARS', description: 'ISO 4217 currency code' })
  baseCurrency!: string;

  @ApiProperty({ enum: TripStatus, example: TripStatus.ACTIVE })
  status!: TripStatus;

  @ApiProperty({ example: 1, nullable: true, description: 'Id del emoji (1..30)' })
  iconId!: number | null;

  @ApiProperty({ example: 1, nullable: true, description: 'Id del color (1..30)' })
  colorId!: number | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ format: 'date-time', nullable: true })
  deletedAt!: string | null;

  // Estas relaciones aparecen segun el endpoint:
  //   - findOne / create / update -> participations con user
  //   - findAllForUser -> participations sin user + _count
  @ApiProperty({ type: () => [ParticipationEntity], required: false })
  participations?: ParticipationEntity[];

  @ApiProperty({ type: () => TripCountEntity, required: false })
  _count?: TripCountEntity;
}
