import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    @Optional() private redisService?: RedisService,
  ) {}

  async getStats() {
    const [totalUsers, totalLikes, totalMatches, totalMessages, activeUsers] =
      await Promise.all([
        this.prisma.user.count({
          where: { deletedAt: null },
        }),
        this.prisma.like.count(),
        this.prisma.match.count(),
        this.prisma.message.count(),
        this.prisma.user.count({
          where: {
            deletedAt: null,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        }),
      ]);

    return {
      totalUsers,
      totalLikes,
      totalMatches,
      totalMessages,
      activeUsers,
      matchRate: totalLikes > 0 ? ((totalMatches * 2) / totalLikes) * 100 : 0,
    };
  }

  async getAllUsers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          major: true,
          role: true,
          likesCount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({
        where: { deletedAt: null },
      }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLeaderboard(limit: number = 10) {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        major: true,
        likesCount: true,
      },
      orderBy: { likesCount: 'desc' },
      take: limit,
    });

    return users.map((user, index) => ({
      rank: index + 1,
      ...user,
    }));
  }

  async resetLikesCount() {
    // This is a dangerous operation - should be protected
    await this.prisma.user.updateMany({
      data: {
        likesCount: 0,
      },
    });

    // Clear leaderboard cache (if Redis available)
    if (this.redisService) {
      await this.redisService.del('leaderboard:top');
    }

    return { message: 'Likes count reset successfully' };
  }

  async deleteUser(userId: string) {
    // Soft delete
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    return { message: 'User deleted successfully' };
  }
}
