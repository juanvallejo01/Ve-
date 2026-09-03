import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { BlocksService } from '../blocks/blocks.service';
import { MatchesService } from '../matches/matches.service';
import { resolveDisplayName } from '@/common/utils/display-name.util';

@Injectable()
export class LikesService {
  constructor(
    private prisma: PrismaService,
    @Optional() private redisService: RedisService,
    private configService: ConfigService,
    private blocksService: BlocksService,
    private matchesService: MatchesService,
  ) {}

  async createLike(senderId: string, receiverId: string) {
    // Validate not self-like (application-level check for better UX)
    if (senderId === receiverId) {
      throw new BadRequestException('Cannot like yourself');
    }

    if (await this.blocksService.isBlocked(senderId, receiverId)) {
      throw new ForbiddenException('You cannot match with this user');
    }

    // Check rate limits
    await this.checkRateLimits(senderId);

    // Check if receiver exists and is not deleted
    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver || receiver.deletedAt) {
      throw new NotFoundException('User not found');
    }

    // Check if sender is not soft deleted
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
    });

    if (!sender || sender.deletedAt) {
      throw new BadRequestException('Your account is deleted');
    }

    try {
      // Use transaction for atomic operations
      const result = await this.prisma.$transaction(async (tx) => {
        // Create like - DB will enforce unique constraint
        const like = await tx.like.create({
          data: {
            senderId,
            receiverId,
          },
        });

        // Increment receiver's likes count
        await tx.user.update({
          where: { id: receiverId },
          data: { likesCount: { increment: 1 } },
        });

        // Check if reverse like exists (mutual like)
        const reverseLike = await tx.like.findUnique({
          where: {
            senderId_receiverId: {
              senderId: receiverId,
              receiverId: senderId,
            },
          },
        });

        let matchCreated = false;
        let match = null;

        if (reverseLike) {
          // Create match with ordered pair (lower id first)
          const [userAId, userBId] =
            senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId];

          // Use upsert to handle race condition when both users like simultaneously
          // If match already exists, it won't throw error
          try {
            match = await tx.match.create({
              data: {
                userAId,
                userBId,
              },
            });

            // Create notifications for both users (only if match was just created)
            await tx.notification.createMany({
              data: [
                {
                  userId: senderId,
                  type: 'MATCH',
                  referenceId: match.id,
                },
                {
                  userId: receiverId,
                  type: 'MATCH',
                  referenceId: match.id,
                },
              ],
            });

            // senderId acaba de "responder" (le dio like de vuelta) al
            // LIKE_RECEIVED que le había llegado de receiverId — ya no queda
            // nada pendiente que revisar ahí, así que se marca como leída
            // para que no siga sumando al contador de pendientes.
            await tx.notification.updateMany({
              where: {
                userId: senderId,
                type: 'LIKE_RECEIVED',
                referenceId: receiverId,
                read: false,
              },
              data: { read: true },
            });

            matchCreated = true;
          } catch (matchError: any) {
            // If match already exists (P2002 - unique constraint violation), that's OK
            // This can happen when both users like each other simultaneously
            if (matchError.code === 'P2002') {
              // Match already exists, find it
              const existingMatch = await tx.match.findUnique({
                where: {
                  userAId_userBId: {
                    userAId,
                    userBId,
                  },
                },
              });
              match = existingMatch;
              matchCreated = false; // Match was already created by concurrent request
            } else {
              throw matchError;
            }
          }
        } else {
          // One-way like: let the receiver know so they can review and decide
          await tx.notification.create({
            data: {
              userId: receiverId,
              type: 'LIKE_RECEIVED',
              referenceId: senderId,
            },
          });
        }

        return { like, matchCreated, matchId: match?.id };
      });

      // Invalidate leaderboard cache (if Redis available)
      if (this.redisService) {
        await this.redisService.del('leaderboard:top');
      }

      return result;
    } catch (error: any) {
      // Handle duplicate like error (P2002 - unique constraint violation)
      if (error.code === 'P2002') {
        throw new ConflictException('Like already exists');
      }
      // Re-throw other errors
      throw error;
    }
  }

  async getLikesSent(userId: string) {
    const [likes, matchedIds] = await Promise.all([
      this.prisma.like.findMany({
        where: {
          senderId: userId,
          receiver: {
            deletedAt: null, // Exclude soft-deleted users
          },
        },
        include: {
          receiver: {
            select: {
              id: true,
              name: true,
              nickname: true,
              major: true,
              likesCount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.matchesService.getMatchedUserIds(userId),
    ]);

    // Un like enviado no implica match — solo se ve el apodo salvo que ya
    // hayan hecho match.
    return likes.map((like) => ({
      ...like,
      receiver: {
        ...like.receiver,
        name: resolveDisplayName(like.receiver, userId, matchedIds),
        nickname: undefined,
      },
    }));
  }

  async getLikesReceived(userId: string) {
    const [likes, matchedIds] = await Promise.all([
      this.prisma.like.findMany({
        where: {
          receiverId: userId,
          sender: {
            deletedAt: null, // Exclude soft-deleted users
          },
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              nickname: true,
              major: true,
              likesCount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.matchesService.getMatchedUserIds(userId),
    ]);

    return likes.map((like) => ({
      ...like,
      sender: {
        ...like.sender,
        name: resolveDisplayName(like.sender, userId, matchedIds),
        nickname: undefined,
      },
    }));
  }

  private async checkRateLimits(userId: string) {
    // Skip rate limiting if Redis is not available
    if (!this.redisService) {
      return;
    }

    const minuteLimit = this.configService.get<number>('rateLimit.likesPerMinute') || 20;
    const dayLimit = this.configService.get<number>('rateLimit.likesPerDay') || 100;

    // Check per-minute limit
    const minuteKey = `ratelimit:like:minute:${userId}`;
    const minuteResult = await this.redisService.checkRateLimit(
      minuteKey,
      minuteLimit,
      60,
    );

    if (!minuteResult.allowed) {
      throw new ForbiddenException(
        `Rate limit exceeded. Please wait until ${minuteResult.resetAt.toISOString()}`,
      );
    }

    // Check per-day limit
    const dayKey = `ratelimit:like:day:${userId}`;
    const dayResult = await this.redisService.checkRateLimit(dayKey, dayLimit, 86400);

    if (!dayResult.allowed) {
      throw new ForbiddenException(
        `Daily limit exceeded. Resets at ${dayResult.resetAt.toISOString()}`,
      );
    }
  }
}
