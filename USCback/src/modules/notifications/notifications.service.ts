import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getNotifications(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const matchIds = notifications
      .filter((n) => n.type === 'MATCH')
      .map((n) => n.referenceId);
    const likeSenderIds = notifications
      .filter((n) => n.type === 'LIKE_RECEIVED')
      .map((n) => n.referenceId);

    const matches = matchIds.length
      ? await this.prisma.match.findMany({
          where: { id: { in: matchIds } },
          select: { id: true, userAId: true, userBId: true },
        })
      : [];
    const matchById = new Map(matches.map((m) => [m.id, m]));

    const otherUserIds = new Set<string>(likeSenderIds);
    for (const match of matches) {
      otherUserIds.add(match.userAId === userId ? match.userBId : match.userAId);
    }

    const users = otherUserIds.size
      ? await this.prisma.user.findMany({
          where: { id: { in: Array.from(otherUserIds) } },
          select: { id: true, name: true, nickname: true, major: true, photoUrl: true, photos: true },
        })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    return notifications.map((n) => {
      let fromUser: any = null;
      if (n.type === 'MATCH') {
        // Ya hay match (por eso existe esta notificación) — se ve el nombre real.
        const match = matchById.get(n.referenceId);
        const otherUserId = match
          ? match.userAId === userId
            ? match.userBId
            : match.userAId
          : null;
        fromUser = otherUserId ? (userById.get(otherUserId) ?? null) : null;
      } else if (n.type === 'LIKE_RECEIVED') {
        // Quien dio like no necesariamente hizo match — solo se ve el apodo.
        const liker = userById.get(n.referenceId) ?? null;
        fromUser = liker ? { ...liker, name: liker.nickname || liker.name, nickname: undefined } : null;
      }
      return { ...n, fromUser };
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });

    return { count };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        read: true,
      },
    });

    return { success: true };
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return { success: true };
  }
}
