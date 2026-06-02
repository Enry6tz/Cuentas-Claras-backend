import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getAllTrips() {
    return this.prisma.trip.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: { participations: true, expenses: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
