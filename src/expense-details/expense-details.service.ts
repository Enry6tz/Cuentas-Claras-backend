import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ExpenseSplitType, ParticipationRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CurrencyService } from '../currency/currency.service';
import { BalancesService } from '../balances/balances.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { QueryMyExpensesDto } from './dto/query-my-expenses.dto';

const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
} as const;

@Injectable()
export class ExpenseDetailsService {
  private readonly logger = new Logger(ExpenseDetailsService.name);

  constructor(
    private prisma: PrismaService,
    private currencyService: CurrencyService,
    private balancesService: BalancesService,
  ) {}

  async create(userId: string, tripId: string, dto: CreateExpenseDto) {
    try {
      await this.assertCanCreate(userId, tripId);

      const allUserIds = this.getAllReferencedUserIds(dto);
      const participants = await this.assertAllAreParticipants(tripId, allUserIds);

      const totalPaid = dto.payers.reduce((sum, p) => sum + p.amountPaid, 0);
      if (Math.abs(totalPaid - dto.originalAmount) > 0.01) {
        throw new NotFoundException({
          code: 'AMOUNT_PAID_MISMATCH',
          message: `Sum of amountPaid (${totalPaid}) must equal originalAmount (${dto.originalAmount})`,
        });
      }

      const trip = await this.prisma.trip.findUniqueOrThrow({
        where: { id: tripId },
      });

      const { exchangeRate, baseAmount } = await this.currencyService.convert(
        dto.originalAmount,
        dto.originalCurrency,
        trip.baseCurrency,
        dto.manualExchangeRate,
      );

      const detailsData = this.buildDetails(
        dto.splitType,
        participants.map((p) => p.userId),
        dto,
        baseAmount,
        exchangeRate,
      );

      const expense = await this.prisma.$transaction(async (tx) => {
        return tx.expense.create({
          data: {
            creatorId: userId,
            tripId,
            description: dto.description,
            originalAmount: dto.originalAmount,
            originalCurrency: dto.originalCurrency,
            exchangeRate,
            baseAmount,
            splitType: dto.splitType,
            date: dto.date ? new Date(dto.date) : new Date(),
            category: dto.category,
            details: {
              create: detailsData.map((dd) => ({
                userId: dd.userId,
                amountPaid: dd.amountPaid,
                amountOwed: dd.amountOwed,
              })),
            },
          },
          include: {
            details: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, avatarUrl: true },
                },
              },
            },
            creator: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        });
      });

      await this.balancesService.recalculateTripBalances(tripId);

      return expense;
    } catch (error) {
      this.logger.error(`Failed to create expense for trip ${tripId}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  async findAll(userId: string, tripId: string) {
    await this.assertIsParticipant(userId, tripId);

    return this.prisma.expense.findMany({
      where: { tripId, deletedAt: null },
      include: {
        details: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        creator: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Lista paginada de gastos del usuario a través de TODOS sus viajes (aquellos
   * donde participa). Soporta filtros por viaje, categoría, texto y rango de
   * fechas. Pensado para la página global de Gastos.
   */
  async findAllForUser(userId: string, query: QueryMyExpensesDto) {
    const { page, limit } = query;

    const where: Prisma.ExpenseWhereInput = {
      deletedAt: null,
      trip: {
        deletedAt: null,
        participations: { some: { userId } },
      },
    };

    if (query.tripId) where.tripId = query.tripId;
    if (query.category) {
      where.category = { equals: query.category, mode: 'insensitive' };
    }
    if (query.q) {
      where.description = { contains: query.q, mode: 'insensitive' };
    }
    if (query.from || query.to) {
      const date: Prisma.DateTimeFilter = {};
      if (query.from) date.gte = new Date(query.from);
      if (query.to) {
        const end = new Date(query.to);
        end.setHours(23, 59, 59, 999);
        date.lte = end;
      }
      where.date = date;
    }

    const [items, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: {
          details: { include: { user: { select: PUBLIC_USER_SELECT } } },
          creator: { select: PUBLIC_USER_SELECT },
          trip: { select: { id: true, name: true, baseCurrency: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return { items, total, page, limit, hasMore: page * limit < total };
  }

  async findOne(userId: string, tripId: string, expenseId: string) {
    await this.assertIsParticipant(userId, tripId);

    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, tripId, deletedAt: null },
      include: {
        details: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        creator: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException({
        code: 'EXPENSE_NOT_FOUND',
        message: 'Expense not found',
      });
    }

    return expense;
  }

  async remove(userId: string, tripId: string, expenseId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, tripId, deletedAt: null },
    });

    if (!expense) {
      throw new NotFoundException({
        code: 'EXPENSE_NOT_FOUND',
        message: 'Expense not found',
      });
    }

    const participation = await this.prisma.participation.findUnique({
      where: { userId_tripId: { userId, tripId } },
    });

    if (!participation) {
      throw new ForbiddenException({
        code: 'NOT_TRIP_PARTICIPANT',
        message: 'You are not a participant of this trip',
      });
    }

    if (
      participation.role !== ParticipationRole.CREATOR &&
      expense.creatorId !== userId
    ) {
      throw new ForbiddenException({
        code: 'ONLY_EXPENSE_OR_TRIP_CREATOR',
        message: 'Only the expense creator or trip creator can delete this expense',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id: expenseId },
        data: { deletedAt: new Date() },
      });
    });

    await this.balancesService.recalculateTripBalances(tripId);
  }

  private async assertCanCreate(userId: string, tripId: string) {
    const participation = await this.prisma.participation.findUnique({
      where: { userId_tripId: { userId, tripId } },
    });

    if (!participation) {
      throw new NotFoundException({
        code: 'TRIP_NOT_FOUND',
        message: 'Trip not found',
      });
    }

    if (participation.role === ParticipationRole.SUPERVISOR) {
      throw new ForbiddenException({
        code: 'SUPERVISOR_CANNOT_CREATE_EXPENSE',
        message: 'Supervisors cannot create expenses',
      });
    }
  }

  private async assertIsParticipant(userId: string, tripId: string) {
    const participation = await this.prisma.participation.findUnique({
      where: { userId_tripId: { userId, tripId } },
    });

    if (!participation) {
      const trip = await this.prisma.trip.findUnique({
        where: { id: tripId },
      });
      if (!trip || trip.deletedAt) {
        throw new NotFoundException({
        code: 'TRIP_NOT_FOUND',
        message: 'Trip not found',
      });
      }
      throw new ForbiddenException({
        code: 'NOT_TRIP_PARTICIPANT',
        message: 'You are not a participant of this trip',
      });
    }
  }

  private async assertAllAreParticipants(
    tripId: string,
    userIds: string[],
  ): Promise<{ userId: string }[]> {
    const participants = await this.prisma.participation.findMany({
      where: { tripId, userId: { in: userIds } },
      select: { userId: true },
    });

    const foundIds = new Set(participants.map((p) => p.userId));
    const missing = userIds.filter((id) => !foundIds.has(id));

    if (missing.length > 0) {
      throw new NotFoundException({
        code: 'USERS_NOT_PARTICIPANTS',
        message: `Some users are not participants of this trip: ${missing.join(', ')}`,
      });
    }

    return participants;
  }

  private getAllReferencedUserIds(dto: CreateExpenseDto): string[] {
    const ids = new Set<string>();

    for (const payer of dto.payers) {
      ids.add(payer.userId);
    }

    if (dto.splitType === ExpenseSplitType.EQUAL && dto.participantIds) {
      for (const pid of dto.participantIds) {
        ids.add(pid);
      }
    }

    if (dto.splitType === ExpenseSplitType.EXACT && dto.exactShares) {
      for (const share of dto.exactShares) {
        ids.add(share.userId);
      }
    }

    if (dto.splitType === ExpenseSplitType.PERCENT && dto.percentShares) {
      for (const share of dto.percentShares) {
        ids.add(share.userId);
      }
    }

    return Array.from(ids);
  }

  private buildDetails(
    splitType: ExpenseSplitType,
    allParticipantIds: string[],
    dto: CreateExpenseDto,
    baseAmount: number,
    exchangeRate: number,
  ): { userId: string; amountPaid: number; amountOwed: number }[] {
    const payerMap = new Map<string, number>();
    for (const payer of dto.payers) {
      const basePaid = Math.round(payer.amountPaid * exchangeRate * 100) / 100;
      payerMap.set(payer.userId, (payerMap.get(payer.userId) ?? 0) + basePaid);
    }

    let owes: Map<string, number>;

    switch (splitType) {
      case ExpenseSplitType.EQUAL:
        owes = this.splitEqual(allParticipantIds, baseAmount);
        break;
      case ExpenseSplitType.EXACT:
        owes = this.splitExact(dto, baseAmount);
        break;
      case ExpenseSplitType.PERCENT:
        owes = this.splitPercent(dto, baseAmount);
        break;
    }

    const allUserIds = new Set([
      ...Array.from(payerMap.keys()),
      ...Array.from(owes.keys()),
    ]);

    const details: { userId: string; amountPaid: number; amountOwed: number }[] = [];

    for (const userId of allUserIds) {
      details.push({
        userId,
        amountPaid: payerMap.get(userId) ?? 0,
        amountOwed: owes.get(userId) ?? 0,
      });
    }

    return details;
  }

  private splitEqual(
    participantIds: string[],
    baseAmount: number,
  ): Map<string, number> {
    const owes = new Map<string, number>();
    const n = participantIds.length;

    if (n === 0) return owes;

    const perPerson = Math.floor((baseAmount * 100) / n) / 100;
    const totalAllocated = perPerson * n;
    let residual = Math.round((baseAmount - totalAllocated) * 100) / 100;

    for (const id of participantIds) {
      let amount = perPerson;
      if (residual > 0.005) {
        amount = Math.round((amount + 0.01) * 100) / 100;
        residual = Math.round((residual - 0.01) * 100) / 100;
      }
      owes.set(id, amount);
    }

    return owes;
  }

  private splitExact(
    dto: CreateExpenseDto,
    baseAmount: number,
  ): Map<string, number> {
    const owes = new Map<string, number>();

    if (!dto.exactShares) {
      throw new NotFoundException({
        code: 'EXACT_SHARES_REQUIRED',
        message: 'exactShares is required for EXACT split',
      });
    }

    const totalExact = dto.exactShares.reduce((sum, s) => sum + s.amountOwed, 0);
    if (Math.abs(totalExact - baseAmount) > 0.01) {
      throw new NotFoundException({
        code: 'EXACT_SHARES_MISMATCH',
        message: `Sum of exactShares (${totalExact}) must equal baseAmount (${baseAmount})`,
      });
    }

    for (const share of dto.exactShares) {
      owes.set(share.userId, share.amountOwed);
    }

    return owes;
  }

  private splitPercent(
    dto: CreateExpenseDto,
    baseAmount: number,
  ): Map<string, number> {
    const owes = new Map<string, number>();

    if (!dto.percentShares) {
      throw new NotFoundException({
        code: 'PERCENT_SHARES_REQUIRED',
        message: 'percentShares is required for PERCENT split',
      });
    }

    const totalPercent = dto.percentShares.reduce((sum, s) => sum + s.percent, 0);
    if (Math.abs(totalPercent - 100) > 0.01) {
      throw new NotFoundException({
        code: 'PERCENT_SHARES_MISMATCH',
        message: `Sum of percentShares (${totalPercent}) must equal 100`,
      });
    }

    let totalAllocated = 0;
    for (let i = 0; i < dto.percentShares.length; i++) {
      const share = dto.percentShares[i];
      const isLast = i === dto.percentShares.length - 1;

      let amount: number;
      if (isLast) {
        amount = Math.round((baseAmount - totalAllocated) * 100) / 100;
      } else {
        amount = Math.round((baseAmount * share.percent / 100) * 100) / 100;
        totalAllocated = Math.round((totalAllocated + amount) * 100) / 100;
      }

      owes.set(share.userId, amount);
    }

    return owes;
  }
}
