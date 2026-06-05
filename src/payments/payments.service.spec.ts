import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ParticipationRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BalancesService } from '../balances/balances.service';
import { PaymentsService } from './payments.service';

/**
 * Tests del PaymentsService.
 *
 * Un "payment" es un pago de un deudor a un acreedor para saldar deuda.
 * Las reglas clave: deudor y acreedor deben ser distintos, ambos deben ser
 * participantes del viaje, y un SUPERVISOR no puede registrar pagos.
 */
describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: any;
  let balancesService: any;

  beforeEach(async () => {
    prisma = {
      participation: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      trip: {
        findUnique: jest.fn(),
      },
      payment: {
        create: jest.fn().mockResolvedValue({ id: 'pay-1' }),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    balancesService = {
      recalculateTripBalances: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: BalancesService, useValue: balancesService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('create', () => {
    beforeEach(() => {
      // El actor es participante y puede registrar pagos (MEMBER).
      prisma.participation.findUnique.mockResolvedValue({
        userId: 'a',
        tripId: 'trip-1',
        role: ParticipationRole.MEMBER,
      });
    });

    it('registra el pago cuando deudor y acreedor son participantes distintos', async () => {
      prisma.participation.findMany.mockResolvedValue([
        { userId: 'a' },
        { userId: 'b' },
      ]);

      const result = await service.create('a', 'trip-1', {
        debtorId: 'a',
        creditorId: 'b',
        amount: 50,
      });

      expect(prisma.payment.create).toHaveBeenCalled();
      expect(balancesService.recalculateTripBalances).toHaveBeenCalledWith('trip-1');
      expect(result.id).toBe('pay-1');
    });

    it('rechaza si deudor y acreedor son la misma persona', async () => {
      await expect(
        service.create('a', 'trip-1', {
          debtorId: 'a',
          creditorId: 'a',
          amount: 50,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it('rechaza si alguno no es participante del viaje', async () => {
      prisma.participation.findMany.mockResolvedValue([{ userId: 'a' }]); // falta 'b'

      await expect(
        service.create('a', 'trip-1', {
          debtorId: 'a',
          creditorId: 'b',
          amount: 50,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('un SUPERVISOR no puede registrar pagos', async () => {
      prisma.participation.findUnique.mockResolvedValue({
        userId: 'sup',
        tripId: 'trip-1',
        role: ParticipationRole.SUPERVISOR,
      });

      await expect(
        service.create('sup', 'trip-1', {
          debtorId: 'a',
          creditorId: 'b',
          amount: 50,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('el deudor puede borrar su propio pago (soft-delete + recalcula)', async () => {
      prisma.participation.findUnique.mockResolvedValue({
        userId: 'a',
        tripId: 'trip-1',
        role: ParticipationRole.MEMBER,
      });
      prisma.payment.findFirst.mockResolvedValue({ id: 'pay-1', debtorId: 'a' });
      prisma.payment.update.mockResolvedValue({});

      await service.remove('a', 'trip-1', 'pay-1');

      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
      expect(balancesService.recalculateTripBalances).toHaveBeenCalledWith('trip-1');
    });

    it('un MEMBER que no es el deudor no puede borrar el pago', async () => {
      prisma.participation.findUnique.mockResolvedValue({
        userId: 'c',
        tripId: 'trip-1',
        role: ParticipationRole.MEMBER,
      });
      prisma.payment.findFirst.mockResolvedValue({ id: 'pay-1', debtorId: 'a' });

      await expect(service.remove('c', 'trip-1', 'pay-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });
  });

  describe('findAllForUser', () => {
    it('devuelve la página con metadata y filtra por viajes del usuario', async () => {
      prisma.payment.findMany.mockResolvedValue([{ id: 'pay-1' }]);
      prisma.payment.count.mockResolvedValue(1);

      const result = await service.findAllForUser('user-1', {
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        items: [{ id: 'pay-1' }],
        total: 1,
        page: 1,
        limit: 10,
        hasMore: false,
      });

      const args = prisma.payment.findMany.mock.calls[0][0];
      expect(args.where.deletedAt).toBeNull();
      expect(args.where.trip.participations.some.userId).toBe('user-1');
    });

    it('role=debtor acota a pagos donde el usuario es deudor', async () => {
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.payment.count.mockResolvedValue(0);

      await service.findAllForUser('user-1', {
        page: 1,
        limit: 10,
        role: 'debtor',
      });

      const args = prisma.payment.findMany.mock.calls[0][0];
      expect(args.where.debtorId).toBe('user-1');
      expect(args.where.creditorId).toBeUndefined();
    });

    it('role=creditor acota a pagos donde el usuario es acreedor', async () => {
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.payment.count.mockResolvedValue(0);

      await service.findAllForUser('user-1', {
        page: 1,
        limit: 10,
        role: 'creditor',
      });

      const args = prisma.payment.findMany.mock.calls[0][0];
      expect(args.where.creditorId).toBe('user-1');
      expect(args.where.debtorId).toBeUndefined();
    });
  });
});
