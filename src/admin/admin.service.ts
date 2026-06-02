import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTripDto } from '../trips/dto/update-trip.dto';

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

  async getTripById(tripId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, deletedAt: null },
      include: {
        participations: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        _count: {
          select: { participations: true, expenses: true },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return trip;
  }

  async updateTrip(tripId: string, dto: UpdateTripDto) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, deletedAt: null },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const data: Prisma.TripUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.baseCurrency !== undefined) data.baseCurrency = dto.baseCurrency;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.startDate !== undefined) {
      data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    }
    if (dto.endDate !== undefined) {
      data.endDate = dto.endDate ? new Date(dto.endDate) : null;
    }

    return this.prisma.trip.update({
      where: { id: tripId },
      data,
      include: {
        participations: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });
  }

  async removeTrip(tripId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, deletedAt: null },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    await this.prisma.trip.update({
      where: { id: tripId },
      data: { deletedAt: new Date() },
    });
  }
}
