import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { BalancesService } from './balances.service';

/**
 * Tests del BalancesService.
 *
 * Acá vive la matemática de plata del proyecto:
 *  - recalculateTripBalances: recalcula el saldo de cada participante.
 *  - getSettlement: propone quién le paga a quién para saldar todo con la
 *    menor cantidad de transferencias.
 */
describe('BalancesService', () => {
  let service: BalancesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      participation: {
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      expenseDetail: {
        findMany: jest.fn(),
      },
      payment: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalancesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BalancesService>(BalancesService);
  });

  describe('recalculateTripBalances', () => {
    it('calcula saldo = (pagado - debido) + (cobros - pagos)', async () => {
      // 'a' pagó 100 y debe 50 → saldo +50. 'b' pagó 0 y debe 50 → saldo -50.
      prisma.expenseDetail.findMany.mockResolvedValue([
        { userId: 'a', amountPaid: 100, amountOwed: 50 },
        { userId: 'b', amountPaid: 0, amountOwed: 50 },
      ]);
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.participation.findMany.mockResolvedValue([
        { userId: 'a' },
        { userId: 'b' },
      ]);

      await service.recalculateTripBalances('trip-1');

      const calls1 = prisma.participation.update.mock.calls;
      expect(calls1).toHaveLength(2);
      expect(calls1[0][0].where).toEqual({
        userId_tripId: { userId: 'a', tripId: 'trip-1' },
      });
      expect(Number(calls1[0][0].data.currentBalance)).toBe(50);
      expect(calls1[1][0].where).toEqual({
        userId_tripId: { userId: 'b', tripId: 'trip-1' },
      });
      expect(Number(calls1[1][0].data.currentBalance)).toBe(-50);
    });

    it('un pago del deudor al acreedor mueve los saldos hacia 0', async () => {
      // Partiendo del caso anterior, 'b' le paga 50 a 'a' → ambos quedan en 0.
      prisma.expenseDetail.findMany.mockResolvedValue([
        { userId: 'a', amountPaid: 100, amountOwed: 50 },
        { userId: 'b', amountPaid: 0, amountOwed: 50 },
      ]);
      prisma.payment.findMany.mockResolvedValue([
        { debtorId: 'b', creditorId: 'a', amount: 50 },
      ]);
      prisma.participation.findMany.mockResolvedValue([
        { userId: 'a' },
        { userId: 'b' },
      ]);

      await service.recalculateTripBalances('trip-1');

      const calls2 = prisma.participation.update.mock.calls;
      expect(calls2).toHaveLength(2);
      expect(calls2[0][0].where).toEqual({
        userId_tripId: { userId: 'a', tripId: 'trip-1' },
      });
      expect(Number(calls2[0][0].data.currentBalance)).toBe(0);
      expect(calls2[1][0].where).toEqual({
        userId_tripId: { userId: 'b', tripId: 'trip-1' },
      });
      expect(Number(calls2[1][0].data.currentBalance)).toBe(0);
    });
  });

  describe('getBalances', () => {
    it('devuelve el saldo de cada participante formateado a 2 decimales', async () => {
      prisma.participation.findMany.mockResolvedValue([
        { userId: 'a', user: { name: 'Ana' }, currentBalance: 50 },
        { userId: 'b', user: { name: 'Bruno' }, currentBalance: -50 },
      ]);

      const result = await service.getBalances('trip-1');

      expect(result).toEqual([
        { userId: 'a', userName: 'Ana', balance: '50.00' },
        { userId: 'b', userName: 'Bruno', balance: '-50.00' },
      ]);
    });
  });

  describe('getSettlement', () => {
    it('propone las transferencias para saldar las deudas', async () => {
      // Ana es acreedora por 60; Bruno debe 40 y Caro debe 20.
      prisma.participation.findMany.mockResolvedValue([
        { userId: 'a', user: { name: 'Ana' }, currentBalance: 60 },
        { userId: 'b', user: { name: 'Bruno' }, currentBalance: -40 },
        { userId: 'c', user: { name: 'Caro' }, currentBalance: -20 },
      ]);

      const result = await service.getSettlement('trip-1');

      // Dos transferencias, ambas hacia Ana: Bruno 40 y Caro 20.
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        fromUserId: 'b',
        fromUserName: 'Bruno',
        toUserId: 'a',
        toUserName: 'Ana',
        amount: '40.00',
      });
      expect(result).toContainEqual({
        fromUserId: 'c',
        fromUserName: 'Caro',
        toUserId: 'a',
        toUserName: 'Ana',
        amount: '20.00',
      });
    });

    it('sin deudas pendientes, no propone ninguna transferencia', async () => {
      prisma.participation.findMany.mockResolvedValue([
        { userId: 'a', user: { name: 'Ana' }, currentBalance: 0 },
        { userId: 'b', user: { name: 'Bruno' }, currentBalance: 0 },
      ]);

      const result = await service.getSettlement('trip-1');

      expect(result).toEqual([]);
    });
  });
});
