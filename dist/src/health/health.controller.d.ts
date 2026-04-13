import { PrismaService } from '../prisma/prisma.service';
export declare class HealthController {
    private prisma;
    constructor(prisma: PrismaService);
    root(): {
        status: string;
        service: string;
    };
    check(): Promise<{
        status: string;
        timestamp: string;
        db: {
            status: string;
            responseTime: string;
        };
    }>;
}
