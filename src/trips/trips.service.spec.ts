import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ParticipationRole, TripStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TripsService } from './trips.service';

/**
 * Tests del TripsService.
 *
 * Estos son "unit tests": probamos SOLO la lógica del service, sin base de
 * datos real. Reemplazamos Prisma por un objeto falso (mock) cuyas funciones
 * devuelven lo que nosotros decidimos. Así verificamos las REGLAS de negocio
 * (quién puede hacer qué) de forma rápida y determinística.
 */
describe('TripsService', () => {
  let service: TripsService;
  let prisma: any;

  const mockCreatorParticipation = {
    userId: 'user-creator',
    tripId: 'trip-1',
    role: ParticipationRole.CREATOR,
  };

  const mockMemberParticipation = {
    userId: 'user-member',
    tripId: 'trip-1',
    role: ParticipationRole.MEMBER,
  };

  beforeEach(async () => {
    prisma = {
      trip: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      participation: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      // $transaction recibe un callback y le pasa un "tx" (cliente de
      // transacción). Acá simplemente le pasamos el mismo prisma mock.
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TripsService>(TripsService);
  });

  describe('create', () => {
    it('crea el viaje y registra al creador como CREATOR (atómico)', async () => {
      prisma.trip.create.mockResolvedValue({ id: 'trip-1' });
      prisma.participation.create.mockResolvedValue({});
      prisma.trip.findUniqueOrThrow.mockResolvedValue({
        id: 'trip-1',
        name: 'Bariloche',
        participations: [mockCreatorParticipation],
      });

      const result = await service.create('user-creator', {
        name: 'Bariloche',
        baseCurrency: 'ARS',
      });

      // El que crea queda automáticamente como CREATOR del viaje.
      expect(prisma.participation.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-creator',
          tripId: 'trip-1',
          role: ParticipationRole.CREATOR,
        },
      });
      // Y se ejecuta dentro de una transacción (todo o nada).
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.id).toBe('trip-1');
    });
  });

  describe('findOne', () => {
    it('devuelve el viaje si el usuario es participante', async () => {
      prisma.trip.findFirst.mockResolvedValue({
        id: 'trip-1',
        participations: [mockCreatorParticipation],
      });

      const result = await service.findOne('user-creator', 'trip-1');

      expect(result.id).toBe('trip-1');
    });

    it('lanza NotFound si el viaje no existe o está borrado', async () => {
      prisma.trip.findFirst.mockResolvedValue(null);

      await expect(service.findOne('user-creator', 'trip-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza Forbidden si el usuario NO es participante del viaje', async () => {
      prisma.trip.findFirst.mockResolvedValue({
        id: 'trip-1',
        participations: [mockCreatorParticipation], // no incluye a 'intruso'
      });

      await expect(service.findOne('intruso', 'trip-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('permite actualizar al CREATOR del viaje', async () => {
      prisma.participation.findUnique.mockResolvedValue(mockCreatorParticipation);
      prisma.trip.findUnique.mockResolvedValue({ id: 'trip-1', deletedAt: null });
      prisma.trip.update.mockResolvedValue({ id: 'trip-1', name: 'Nuevo nombre' });

      const result = await service.update('user-creator', 'trip-1', {
        name: 'Nuevo nombre',
      });

      expect(prisma.trip.update).toHaveBeenCalled();
      expect(result.name).toBe('Nuevo nombre');
    });

    it('lanza Forbidden si un MEMBER intenta actualizar', async () => {
      prisma.participation.findUnique.mockResolvedValue(mockMemberParticipation);

      await expect(
        service.update('user-member', 'trip-1', { name: 'Hack' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.trip.update).not.toHaveBeenCalled();
    });

    it('lanza NotFound si el usuario no es participante', async () => {
      prisma.participation.findUnique.mockResolvedValue(null);

      await expect(
        service.update('desconocido', 'trip-1', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('el CREATOR hace soft-delete (setea deletedAt)', async () => {
      prisma.participation.findUnique.mockResolvedValue(mockCreatorParticipation);
      prisma.trip.findUnique.mockResolvedValue({ id: 'trip-1', deletedAt: null });
      prisma.trip.update.mockResolvedValue({});

      await service.remove('user-creator', 'trip-1');

      expect(prisma.trip.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'trip-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });

    it('lanza Forbidden si un MEMBER intenta borrar', async () => {
      prisma.participation.findUnique.mockResolvedValue(mockMemberParticipation);

      await expect(service.remove('user-member', 'trip-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.trip.update).not.toHaveBeenCalled();
    });
  });
});
