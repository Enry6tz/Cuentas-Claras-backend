import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findByClerkId(clerkId: string): Promise<User>;
    findById(id: string): Promise<User>;
    updateProfile(userId: string, data: {
        name?: string;
    }): Promise<{
        id: string;
        clerkId: string;
        email: string;
        name: string;
        avatarUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    searchByEmail(query: string): Promise<{
        id: string;
        email: string;
        name: string;
        avatarUrl: string | null;
    }[]>;
}
