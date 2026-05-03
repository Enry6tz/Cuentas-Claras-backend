"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let TripsService = class TripsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, dto) {
        return this.prisma.$transaction(async (tx) => {
            const trip = await tx.trip.create({
                data: {
                    name: dto.name,
                    description: dto.description,
                    startDate: dto.startDate ? new Date(dto.startDate) : null,
                    endDate: dto.endDate ? new Date(dto.endDate) : null,
                    baseCurrency: dto.baseCurrency,
                },
            });
            await tx.participation.create({
                data: {
                    userId,
                    tripId: trip.id,
                    role: client_1.ParticipationRole.CREATOR,
                },
            });
            return tx.trip.findUniqueOrThrow({
                where: { id: trip.id },
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
        });
    }
    async findAllForUser(userId) {
        return this.prisma.trip.findMany({
            where: {
                deletedAt: null,
                participations: {
                    some: { userId },
                },
            },
            include: {
                participations: {
                    select: {
                        userId: true,
                        role: true,
                    },
                },
                _count: {
                    select: { participations: true, expenses: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(userId, tripId) {
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
            },
        });
        if (!trip) {
            throw new common_1.NotFoundException('Trip not found');
        }
        const isParticipant = trip.participations.some((p) => p.userId === userId);
        if (!isParticipant) {
            throw new common_1.ForbiddenException('You are not a participant of this trip');
        }
        return trip;
    }
    async update(userId, tripId, dto) {
        await this.assertIsCreator(userId, tripId);
        const data = {};
        if (dto.name !== undefined)
            data.name = dto.name;
        if (dto.description !== undefined)
            data.description = dto.description;
        if (dto.baseCurrency !== undefined)
            data.baseCurrency = dto.baseCurrency;
        if (dto.status !== undefined)
            data.status = dto.status;
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
    async remove(userId, tripId) {
        await this.assertIsCreator(userId, tripId);
        await this.prisma.trip.update({
            where: { id: tripId },
            data: { deletedAt: new Date() },
        });
    }
    async assertIsCreator(userId, tripId) {
        const participation = await this.prisma.participation.findUnique({
            where: { userId_tripId: { userId, tripId } },
        });
        if (!participation) {
            throw new common_1.NotFoundException('Trip not found');
        }
        if (participation.role !== client_1.ParticipationRole.CREATOR) {
            throw new common_1.ForbiddenException('Only the trip creator can perform this action');
        }
        const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
        if (!trip || trip.deletedAt) {
            throw new common_1.NotFoundException('Trip not found');
        }
    }
};
exports.TripsService = TripsService;
exports.TripsService = TripsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TripsService);
//# sourceMappingURL=trips.service.js.map