import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { BlocksService } from '../blocks/blocks.service';
import { MatchesService } from '../matches/matches.service';
import { resolveDisplayName } from '@/common/utils/display-name.util';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private blocksService: BlocksService,
    private matchesService: MatchesService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        nickname: true,
        email: true,
        major: true,
        likesCount: true,
        role: true,
        photoUrl: true,
        photos: true,
        bio: true,
        bannerUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getUserById(userId: string, currentUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        nickname: true,
        major: true,
        likesCount: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatched = await this.matchesService.checkMatch(currentUserId, userId);

    return { ...user, name: resolveDisplayName(user, currentUserId, isMatched), nickname: undefined };
  }

  async getUserProfile(userId: string, currentUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        nickname: true,
        email: true,
        major: true,
        photoUrl: true,
        createdAt: true,
        posts: {
          where: {
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
                comments: {
                  where: {
                    deletedAt: null,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            posts: {
              where: {
                deletedAt: null,
              },
            },
            receivedLikes: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [relationship, isMatched] = await Promise.all([
      this.blocksService.getRelationship(currentUserId, userId),
      this.matchesService.checkMatch(currentUserId, userId),
    ]);

    // Check which posts current user has liked
    const postIds = user.posts.map((p) => p.id);
    const userLikes = await this.prisma.postLike.findMany({
      where: {
        userId: currentUserId,
        postId: { in: postIds },
      },
      select: { postId: true },
    });

    const likedPostIds = new Set(userLikes.map((l) => l.postId));

    // El perfil completo (nombre real) solo se revela si ya hay match —
    // antes de eso, solo se ve el apodo.
    const displayName = resolveDisplayName(user, currentUserId, isMatched);

    // Format posts with like status
    const postsWithLikeStatus = user.posts.map((post) => ({
      ...post,
      user: { ...post.user, name: displayName, nickname: undefined },
      likesCount: post._count.postLikes,
      commentsCount: post._count.comments,
      isLiked: likedPostIds.has(post.id),
      _count: undefined,
    }));

    return {
      ...user,
      name: displayName,
      nickname: undefined,
      posts: postsWithLikeStatus,
      isMatched,
      blockedByMe: relationship.blockedByMe,
      blockedMe: relationship.blockedMe,
    };
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    // Note: the soft-delete middleware rewrites User.update() into updateMany(),
    // which only returns { count } and doesn't support `select`, so we re-fetch.
    await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });

    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        nickname: true,
        email: true,
        major: true,
        likesCount: true,
        photoUrl: true,
        photos: true,
        bio: true,
        bannerUrl: true,
        createdAt: true,
      },
    });
  }

  /**
   * Elimina la cuenta de forma definitiva (requisito de App Store 5.1.1(v),
   * Google Play y la Ley 1581 de habeas data). Todas las relaciones del
   * usuario (posts, likes, matches, mensajes, tokens…) tienen
   * `onDelete: Cascade`, así que se borran con él. Antes se descuentan los
   * likes que dio, para que el ranking de los demás siga cuadrando.
   */
  async deleteAccount(userId: string) {
    await this.prisma.$transaction([
      // Likes de perfil que dio → restar al receptor.
      this.prisma.$executeRaw`
        UPDATE users u SET "likesCount" = GREATEST(u."likesCount" - l.n, 0)
        FROM (SELECT "receiverId" AS id, COUNT(*)::int AS n FROM likes
              WHERE "senderId" = ${userId} GROUP BY "receiverId") l
        WHERE u.id = l.id`,
      // Likes a posts ajenos que dio → restar al post y a su autor.
      this.prisma.$executeRaw`
        UPDATE posts p SET "likesCount" = GREATEST(p."likesCount" - 1, 0)
        FROM post_likes pl
        WHERE pl."postId" = p.id AND pl."userId" = ${userId} AND p."userId" <> ${userId}`,
      this.prisma.$executeRaw`
        UPDATE users u SET "likesCount" = GREATEST(u."likesCount" - a.n, 0)
        FROM (SELECT p."userId" AS id, COUNT(*)::int AS n FROM post_likes pl
              JOIN posts p ON p.id = pl."postId"
              WHERE pl."userId" = ${userId} AND p."userId" <> ${userId}
              GROUP BY p."userId") a
        WHERE u.id = a.id`,
      this.prisma.user.delete({ where: { id: userId } }),
    ]);

    return { message: 'Account deleted successfully' };
  }

  async searchUsers(query: string, currentUserId: string) {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const [blockedIds, matchedIds] = await Promise.all([
      this.blocksService.getBlockedUserIds(currentUserId),
      this.matchesService.getMatchedUserIds(currentUserId),
    ]);

    // Solo se busca por apodo — la única forma de encontrar a alguien por su
    // nombre real es si ya hay match con esa persona (para "reencontrarla").
    const users = await this.prisma.user.findMany({
      where: {
        id: { notIn: [currentUserId, ...blockedIds] },
        deletedAt: null,
        OR: [
          { nickname: { contains: trimmed, mode: 'insensitive' } },
          {
            id: { in: Array.from(matchedIds) },
            name: { contains: trimmed, mode: 'insensitive' },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        nickname: true,
        major: true,
        likesCount: true,
        photoUrl: true,
      },
      take: 20,
      orderBy: { name: 'asc' },
    });

    return users.map((user) => ({
      ...user,
      name: resolveDisplayName(user, currentUserId, matchedIds),
      nickname: undefined,
    }));
  }

  async getRandomUsers(userId: string, limit: number = 10) {
    // Get users excluding current user, deleted users, blocked users, and users already liked
    const [likedUserIds, blockedIds] = await Promise.all([
      this.prisma.like.findMany({
        where: { senderId: userId },
        select: { receiverId: true },
      }),
      this.blocksService.getBlockedUserIds(userId),
    ]);

    const excludedIds = [
      userId,
      ...likedUserIds.map((like) => like.receiverId),
      ...blockedIds,
    ];

    const users = await this.prisma.user.findMany({
      where: {
        id: { notIn: excludedIds },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        nickname: true,
        major: true,
        likesCount: true,
        photoUrl: true,
        photos: true,
      },
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Descubrir solo muestra gente sin match todavía (si hubiera match, ya
    // se excluyó arriba vía los likes) — siempre se ve el apodo.
    return users.map((user) => ({
      ...user,
      name: resolveDisplayName(user, userId, false),
      nickname: undefined,
    }));
  }
}
