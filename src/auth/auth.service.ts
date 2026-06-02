import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async upsertUser(data: {
    clerkId: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
  }) {
    return this.prisma.user.upsert({
      where: { clerkId: data.clerkId },
      update: {
        email: data.email,
        name: data.name,
        avatarUrl: data.avatarUrl,
      },
      create: {
        clerkId: data.clerkId,
        email: data.email,
        name: data.name,
        avatarUrl: data.avatarUrl,
      },
    });
  }

  async deleteUser(clerkId: string) {
    return this.prisma.user.delete({
      where: { clerkId },
    });
  }
}
