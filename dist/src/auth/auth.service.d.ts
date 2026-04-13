import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private prisma;
    constructor(prisma: PrismaService);
    upsertUser(data: {
        clerkId: string;
        email: string;
        name: string;
        avatarUrl?: string;
    }): Promise<{
        id: string;
        clerkId: string;
        email: string;
        name: string;
        avatarUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteUser(clerkId: string): Promise<{
        id: string;
        clerkId: string;
        email: string;
        name: string;
        avatarUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
