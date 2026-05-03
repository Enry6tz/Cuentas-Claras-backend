import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
export declare class TripsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: string, dto: CreateTripDto): Promise<{
        participations: ({
            user: {
                id: string;
                email: string;
                name: string;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            userId: string;
            tripId: string;
            role: import("@prisma/client").$Enums.ParticipationRole;
            currentBalance: Prisma.Decimal;
            joinedAt: Date;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        startDate: Date | null;
        endDate: Date | null;
        baseCurrency: string;
        status: import("@prisma/client").$Enums.TripStatus;
        deletedAt: Date | null;
    }>;
    findAllForUser(userId: string): Promise<({
        participations: {
            userId: string;
            role: import("@prisma/client").$Enums.ParticipationRole;
        }[];
        _count: {
            participations: number;
            expenses: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        startDate: Date | null;
        endDate: Date | null;
        baseCurrency: string;
        status: import("@prisma/client").$Enums.TripStatus;
        deletedAt: Date | null;
    })[]>;
    findOne(userId: string, tripId: string): Promise<{
        participations: ({
            user: {
                id: string;
                email: string;
                name: string;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            userId: string;
            tripId: string;
            role: import("@prisma/client").$Enums.ParticipationRole;
            currentBalance: Prisma.Decimal;
            joinedAt: Date;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        startDate: Date | null;
        endDate: Date | null;
        baseCurrency: string;
        status: import("@prisma/client").$Enums.TripStatus;
        deletedAt: Date | null;
    }>;
    update(userId: string, tripId: string, dto: UpdateTripDto): Promise<{
        participations: ({
            user: {
                id: string;
                email: string;
                name: string;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            userId: string;
            tripId: string;
            role: import("@prisma/client").$Enums.ParticipationRole;
            currentBalance: Prisma.Decimal;
            joinedAt: Date;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        startDate: Date | null;
        endDate: Date | null;
        baseCurrency: string;
        status: import("@prisma/client").$Enums.TripStatus;
        deletedAt: Date | null;
    }>;
    remove(userId: string, tripId: string): Promise<void>;
    private assertIsCreator;
}
