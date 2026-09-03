import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { MatchesService } from '../matches/matches.service';
import { TypingService } from './typing.service';

const MESSAGE_INCLUDE = {
  sender: { select: { id: true, name: true } },
  receiver: { select: { id: true, name: true } },
};

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private matchesService: MatchesService,
    private configService: ConfigService,
    private typingService: TypingService,
    @Optional() private redisService?: RedisService,
  ) {}

  /** Shared validation for anything that writes into a conversation. */
  private async assertCanWriteTo(senderId: string, receiverId: string) {
    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver || receiver.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const matchExists = await this.matchesService.checkMatch(senderId, receiverId);
    if (!matchExists) {
      throw new ForbiddenException('You can only message users you have matched with');
    }

    const isEphemeral = await this.matchesService.isEphemeral(senderId, receiverId);
    return isEphemeral ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;
  }

  async sendMessage(senderId: string, receiverId: string, content: string) {
    const expiresAt = await this.assertCanWriteTo(senderId, receiverId);

    // Check rate limit
    await this.checkRateLimit(senderId);

    this.typingService.setTyping(senderId, receiverId, false);

    const message = await this.prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
        expiresAt,
      },
      include: MESSAGE_INCLUDE,
    });

    return message;
  }

  async reportScreenshot(senderId: string, receiverId: string) {
    const expiresAt = await this.assertCanWriteTo(senderId, receiverId);

    const message = await this.prisma.message.create({
      data: {
        senderId,
        receiverId,
        content: '',
        type: 'SCREENSHOT_ALERT',
        expiresAt,
      },
      include: MESSAGE_INCLUDE,
    });

    return message;
  }

  setTyping(userId: string, otherUserId: string, isTyping: boolean) {
    this.typingService.setTyping(userId, otherUserId, isTyping);
    return { message: 'ok' };
  }

  getTypingStatus(userId: string, otherUserId: string) {
    return { typing: this.typingService.isTyping(otherUserId, userId) };
  }

  async getConversation(userId: string, otherUserId: string) {
    // Check if match exists
    const matchExists = await this.matchesService.checkMatch(userId, otherUserId);

    if (!matchExists) {
      throw new ForbiddenException('You can only view messages with matched users');
    }

    await this.purgeExpiredMessages({
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    });

    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Ver la conversación cuenta como "atendida": se marcan como leídos los
    // mensajes recibidos pendientes y, si había una notificación de MATCH sin
    // leer para este match, también se marca (ya la vio, o va a responder).
    await this.markConversationSeen(userId, otherUserId);

    return messages;
  }

  private async markConversationSeen(userId: string, otherUserId: string) {
    const [userAId, userBId] =
      userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];

    const [, match] = await Promise.all([
      this.prisma.message.updateMany({
        where: { senderId: otherUserId, receiverId: userId, read: false },
        data: { read: true },
      }),
      this.prisma.match.findUnique({
        where: { userAId_userBId: { userAId, userBId } },
      }),
    ]);

    if (match) {
      await this.prisma.notification.updateMany({
        where: { userId, type: 'MATCH', referenceId: match.id, read: false },
        data: { read: true },
      });
    }
  }

  /** Total de mensajes recibidos aún no leídos — para el badge de pendientes. */
  async getUnreadMessagesCount(userId: string) {
    const count = await this.prisma.message.count({
      where: { receiverId: userId, read: false },
    });
    return { count };
  }

  async getConversations(userId: string) {
    await this.purgeExpiredMessages({
      OR: [{ senderId: userId }, { receiverId: userId }],
    });

    // Get all matches
    const matches = await this.matchesService.getMatches(userId);

    // Get last message for each match
    const conversationsWithLastMessage = await Promise.all(
      matches.map(async (match) => {
        const lastMessage = await this.prisma.message.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: match.matchedUser.id },
              { senderId: match.matchedUser.id, receiverId: userId },
            ],
          },
          orderBy: { createdAt: 'desc' },
        });

        return {
          matchId: match.id,
          matchedUser: match.matchedUser,
          lastMessage,
          matchedAt: match.createdAt,
        };
      }),
    );

    // Sort by last message time or match time
    return conversationsWithLastMessage.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt || a.matchedAt;
      const timeB = b.lastMessage?.createdAt || b.matchedAt;
      return timeB.getTime() - timeA.getTime();
    });
  }

  /** Hard-deletes messages whose 24h ephemeral window has passed. */
  private async purgeExpiredMessages(scope: { OR: Record<string, string>[] }) {
    await this.prisma.message.deleteMany({
      where: { ...scope, expiresAt: { lte: new Date() } },
    });
  }

  private async checkRateLimit(userId: string) {
    // Skip rate limiting if Redis is not available
    if (!this.redisService) {
      return;
    }

    const limit = this.configService.get<number>('rateLimit.messagesPerMinute') || 30;
    const key = `ratelimit:message:minute:${userId}`;
    const result = await this.redisService.checkRateLimit(key, limit, 60);

    if (!result.allowed) {
      throw new ForbiddenException(
        `Rate limit exceeded. Please wait until ${result.resetAt.toISOString()}`,
      );
    }
  }
}
