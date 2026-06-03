import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ExpenseSplitType, ParticipationRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CurrencyService } from '../currency/currency.service';
import { BalancesService } from '../balances/balances.service';
import { ExpenseDetailsService } from './expense-details.service';

/**
 * Tests del ExpenseDetailsService.
 *
 * Lo más importante de probar acá es la MATEMÁTICA de cómo se reparte un gasto
 * (EQUAL / EXACT / PERCENT), porque un error de centavos rompe los balances de
 * todo el viaje. La lógica de reparto es privada, así que la ejercitamos a
 * través de create() e inspeccionamos QUÉ "details" se intentaron guardar.
 */
describe('ExpenseDetailsService', () => {
  let service: ExpenseDetailsService;
  let prisma: any;
  let currencyService: any;
  let balancesService: any;

  // Devuelve el array de details (userId/amountPaid/amountOwed) que el service
  // intentó persistir en la última llamada a create().
  const capturedDetails = () =>
    prisma.expense.create.mock.calls[0][0].data.details.create as {
      userId: string;
      amountPaid: number;
      amountOwed: number;
    }[];

  beforeEach(async () => {
    prisma = {
      participation: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      trip: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'trip-1',
          baseCurrency: 'ARS',
        }),
        findUnique: jest.fn(),
      },
      expense: {
        create: jest.fn().mockResolvedValue({ id: 'exp-1' }),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    currencyService = {
      // Sin conversión: 1 ARS = 1 ARS, así la matemática del reparto queda a la vista.
      convert: jest.fn().mockResolvedValue({ exchangeRate: 1, baseAmount: 100 }),
    };

    balancesService = {
      recalculateTripBalances: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseDetailsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CurrencyService, useValue: currencyService },
        { provide: BalancesService, useValue: balancesService },
      ],
    }).compile();

    service = module.get<ExpenseDetailsService>(ExpenseDetailsService);
  });

  describe('create — reparto del gasto', () => {
    beforeEach(() => {
      // El actor puede crear gastos (es MEMBER).
      prisma.participation.findUnique.mockResolvedValue({
        userId: 'a',
        tripId: 'trip-1',
        role: ParticipationRole.MEMBER,
      });
      // 'a' y 'b' son participantes del viaje.
      prisma.participation.findMany.mockResolvedValue([
        { userId: 'a' },
        { userId: 'b' },
      ]);
    });

    it('EQUAL: divide 100 en partes iguales entre 2 → 50 y 50', async () => {
      await service.create('a', 'trip-1', {
        description: 'Cena',
        originalAmount: 100,
        originalCurrency: 'ARS',
        splitType: ExpenseSplitType.EQUAL,
        payers: [{ userId: 'a', amountPaid: 100 }],
        participantIds: ['a', 'b'],
      });

      const details = capturedDetails();
      const a = details.find((d) => d.userId === 'a')!;
      const b = details.find((d) => d.userId === 'b')!;

      expect(a.amountOwed).toBe(50);
      expect(b.amountOwed).toBe(50);
      expect(a.amountPaid).toBe(100); // 'a' puso toda la plata
      expect(b.amountPaid).toBe(0);
      // El balance del viaje se recalcula después de crear el gasto.
      expect(balancesService.recalculateTripBalances).toHaveBeenCalledWith('trip-1');
    });

    it('EXACT: respeta los montos exactos indicados (30 / 70)', async () => {
      await service.create('a', 'trip-1', {
        description: 'Hotel',
        originalAmount: 100,
        originalCurrency: 'ARS',
        splitType: ExpenseSplitType.EXACT,
        payers: [{ userId: 'a', amountPaid: 100 }],
        exactShares: [
          { userId: 'a', amountOwed: 30 },
          { userId: 'b', amountOwed: 70 },
        ],
      });

      const details = capturedDetails();
      expect(details.find((d) => d.userId === 'a')!.amountOwed).toBe(30);
      expect(details.find((d) => d.userId === 'b')!.amountOwed).toBe(70);
    });

    it('PERCENT: reparte por porcentaje (50% / 50% → 50 y 50)', async () => {
      await service.create('a', 'trip-1', {
        description: 'Combustible',
        originalAmount: 100,
        originalCurrency: 'ARS',
        splitType: ExpenseSplitType.PERCENT,
        payers: [{ userId: 'a', amountPaid: 100 }],
        percentShares: [
          { userId: 'a', percent: 50 },
          { userId: 'b', percent: 50 },
        ],
      });

      const details = capturedDetails();
      expect(details.find((d) => d.userId === 'a')!.amountOwed).toBe(50);
      expect(details.find((d) => d.userId === 'b')!.amountOwed).toBe(50);
    });

    it('rechaza si la suma de lo pagado no coincide con el monto total', async () => {
      await expect(
        service.create('a', 'trip-1', {
          description: 'Mal cargado',
          originalAmount: 100,
          originalCurrency: 'ARS',
          splitType: ExpenseSplitType.EQUAL,
          payers: [{ userId: 'a', amountPaid: 90 }], // 90 != 100
          participantIds: ['a', 'b'],
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.expense.create).not.toHaveBeenCalled();
    });
  });

  describe('create — autorización', () => {
    it('un SUPERVISOR no puede crear gastos', async () => {
      prisma.participation.findUnique.mockResolvedValue({
        userId: 'sup',
        tripId: 'trip-1',
        role: ParticipationRole.SUPERVISOR,
      });

      await expect(
        service.create('sup', 'trip-1', {
          description: 'X',
          originalAmount: 100,
          originalCurrency: 'ARS',
          splitType: ExpenseSplitType.EQUAL,
          payers: [{ userId: 'sup', amountPaid: 100 }],
          participantIds: ['sup'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFound si el actor no participa del viaje', async () => {
      prisma.participation.findUnique.mockResolvedValue(null);

      await expect(
        service.create('intruso', 'trip-1', {
          description: 'X',
          originalAmount: 100,
          originalCurrency: 'ARS',
          splitType: ExpenseSplitType.EQUAL,
          payers: [{ userId: 'intruso', amountPaid: 100 }],
          participantIds: ['intruso'],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('el creador del gasto puede borrarlo (soft-delete + recalcula balances)', async () => {
      prisma.expense.findFirst.mockResolvedValue({ id: 'exp-1', creatorId: 'a' });
      prisma.participation.findUnique.mockResolvedValue({
        userId: 'a',
        tripId: 'trip-1',
        role: ParticipationRole.MEMBER,
      });
      prisma.expense.update.mockResolvedValue({});

      await service.remove('a', 'trip-1', 'exp-1');

      expect(prisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'exp-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
      expect(balancesService.recalculateTripBalances).toHaveBeenCalledWith('trip-1');
    });

    it('un MEMBER que no es el creador del gasto no puede borrarlo', async () => {
      prisma.expense.findFirst.mockResolvedValue({ id: 'exp-1', creatorId: 'a' });
      prisma.participation.findUnique.mockResolvedValue({
        userId: 'b',
        tripId: 'trip-1',
        role: ParticipationRole.MEMBER,
      });

      await expect(service.remove('b', 'trip-1', 'exp-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.expense.update).not.toHaveBeenCalled();
    });

    it('lanza NotFound si el gasto no existe', async () => {
      prisma.expense.findFirst.mockResolvedValue(null);

      await expect(service.remove('a', 'trip-1', 'exp-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
