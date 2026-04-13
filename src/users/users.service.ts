import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByClerkId(clerkId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, data: { name?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async searchByEmail(query: string) {
    return this.prisma.user.findMany({
      where: {
        email: { contains: query, mode: 'insensitive' },
      },
      take: 10,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
      },
    });
  }
}
