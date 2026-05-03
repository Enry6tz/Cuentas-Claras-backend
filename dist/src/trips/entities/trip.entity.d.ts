import { ParticipationRole, TripStatus } from '@prisma/client';
export declare class UserPublicEntity {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
}
export declare class ParticipationEntity {
    id: string;
    userId: string;
    tripId: string;
    role: ParticipationRole;
    currentBalance: string;
    joinedAt: string;
    user?: UserPublicEntity;
}
export declare class TripCountEntity {
    participations: number;
    expenses: number;
}
export declare class TripEntity {
    id: string;
    name: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    baseCurrency: string;
    status: TripStatus;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    participations?: ParticipationEntity[];
    _count?: TripCountEntity;
}
