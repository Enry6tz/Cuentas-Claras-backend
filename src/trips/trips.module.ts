import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { ParticipantsModule } from './participants/participants.module';

/**
 * Cada feature en NestJS se encapsula en un Module.
 *
 *   controllers: clases que manejan rutas HTTP (entry points).
 *   providers:   clases inyectables (services, repositories, etc.). Nest las
 *                instancia y las inyecta donde se piden.
 *   exports:     providers que otros modulos podran inyectar si importan este.
 *
 * `TripsService` lo exportamos porque ExpensesService y PaymentsService van a
 * necesitar verificar pertenencia al trip cuando los implementemos.
 *
 * No declaramos `imports: [PrismaModule]` porque el PrismaModule esta marcado
 * como `@Global()` en `prisma/prisma.module.ts`, asi que el PrismaService esta
 * disponible en todo el app sin tener que importarlo modulo por modulo.
 */
@Module({
  imports: [ParticipantsModule],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
