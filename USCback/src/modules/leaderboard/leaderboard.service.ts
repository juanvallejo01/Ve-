import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

@Injectable()
export class LeaderboardService {
  constructor(
    private prisma: PrismaService,
    @Optional() private redisService?: RedisService,
  ) {}

  // Ranking de usuarios por likes totales en sus posts de la semana
  async getUsersRanking(limit: number = 10) {
    const cacheKey = 'leaderboard:users:weekly';

    // Try to get from cache (if Redis available)
    if (this.redisService) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Get date from 7 days ago
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Query users with their weekly post likes
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        nickname: true,
        major: true,
        photoUrl: true,
        posts: {
          where: {
            createdAt: {
              gte: weekAgo,
            },
            deletedAt: null,
          },
          select: {
            id: true,
            content: true,
            imageUrl: true,
            createdAt: true,
            _count: {
              select: {
                postLikes: true,
              },
            },
          },
        },
      },
    });

    // Calculate total likes and find top post for each user
    const usersWithStats = users.map((user) => {
      const totalLikes = user.posts.reduce((sum, post) => sum + post._count.postLikes, 0);
      const topPost = user.posts.reduce(
        (max, post) =>
          post._count.postLikes > (max?._count.postLikes || 0) ? post : max,
        user.posts[0],
      );

      return {
        id: user.id,
        name: user.nickname || user.name,
        major: user.major,
        photoUrl: user.photoUrl,
        weeklyLikes: totalLikes,
        topPost: topPost
          ? {
              id: topPost.id,
              content: topPost.content,
              imageUrl: topPost.imageUrl,
              likesCount: topPost._count.postLikes,
              createdAt: topPost.createdAt,
            }
          : null,
      };
    });

    // Sort by weekly likes and take top limit
    const leaderboard = usersWithStats
      .sort((a, b) => b.weeklyLikes - a.weeklyLikes)
      .slice(0, limit)
      .map((user, index) => ({
        rank: index + 1,
        ...user,
      }));

    // Cache for 60 seconds (if Redis available)
    if (this.redisService) {
      await this.redisService.set(cacheKey, JSON.stringify(leaderboard), 60);
    }

    return leaderboard;
  }

  // Ranking de posts individuales por likes
  async getPostsRanking(limit: number = 10) {
    const cacheKey = 'leaderboard:posts:weekly';

    // Try to get from cache (if Redis available)
    if (this.redisService) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Get date from 7 days ago
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const posts = await this.prisma.post.findMany({
      where: {
        createdAt: {
          gte: weekAgo,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        content: true,
        imageUrl: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            major: true,
            photoUrl: true,
          },
        },
        _count: {
          select: {
            postLikes: true,
          },
        },
      },
      orderBy: {
        postLikes: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    // Format posts — el ranking siempre muestra el apodo del autor
    const leaderboard = posts.map((post, index) => ({
      rank: index + 1,
      id: post.id,
      content: post.content,
      imageUrl: post.imageUrl,
      createdAt: post.createdAt,
      likesCount: post._count.postLikes,
      user: { ...post.user, name: post.user.nickname || post.user.name, nickname: undefined },
    }));

    // Cache for 60 seconds (if Redis available)
    if (this.redisService) {
      await this.redisService.set(cacheKey, JSON.stringify(leaderboard), 60);
    }

    return leaderboard;
  }

  async getLeaderboard(limit: number = 10) {
    // Legacy endpoint - redirect to users ranking
    return this.getUsersRanking(limit);
  }

  async getUserRank(userId: string) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        major: true,
        posts: {
          where: {
            createdAt: {
              gte: weekAgo,
            },
            deletedAt: null,
          },
          select: {
            _count: {
              select: {
                postLikes: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const weeklyLikes = user.posts.reduce((sum, post) => sum + post._count.postLikes, 0);

    // Get all users with their weekly likes to calculate rank
    const allUsers = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        posts: {
          where: {
            createdAt: {
              gte: weekAgo,
            },
            deletedAt: null,
          },
          select: {
            _count: {
              select: {
                postLikes: true,
              },
            },
          },
        },
      },
    });

    const usersWithLikes = allUsers.map((u) => ({
      id: u.id,
      weeklyLikes: u.posts.reduce((sum, post) => sum + post._count.postLikes, 0),
    }));

    const usersAbove = usersWithLikes.filter((u) => u.weeklyLikes > weeklyLikes).length;

    return {
      rank: usersAbove + 1,
      id: user.id,
      name: user.name,
      major: user.major,
      weeklyLikes,
    };
  }
}
