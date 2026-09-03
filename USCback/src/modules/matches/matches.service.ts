import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class MatchesService {
  constructor(private prisma: PrismaService) {}

  async getMatches(userId: string) {
    const matches = await this.prisma.match.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        AND: [
          {
            userA: {
              deletedAt: null,
            },
          },
          {
            userB: {
              deletedAt: null,
            },
          },
        ],
      },
      include: {
        userA: {
          select: {
            id: true,
            name: true,
            major: true,
            likesCount: true,
            photoUrl: true,
          },
        },
        userB: {
          select: {
            id: true,
            name: true,
            major: true,
            likesCount: true,
            photoUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Return the matched user (not the current user)
    return matches.map((match) => ({
      id: match.id,
      matchedUser: match.userAId === userId ? match.userB : match.userA,
      createdAt: match.createdAt,
    }));
  }

  /**
   * IDs de todos los usuarios con los que `userId` tiene match — en una sola
   * consulta, para resolver nombre-real-vs-apodo de muchos usuarios a la vez
   * (feed, comentarios, ranking) sin hacer N llamadas a checkMatch().
   */
  async getMatchedUserIds(userId: string): Promise<Set<string>> {
    const matches = await this.prisma.match.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      select: { userAId: true, userBId: true },
    });
    return new Set(matches.map((m) => (m.userAId === userId ? m.userBId : m.userAId)));
  }

  async checkMatch(userAId: string, userBId: string): Promise<boolean> {
    const [userId1, userId2] =
      userAId < userBId ? [userAId, userBId] : [userBId, userAId];

    const match = await this.prisma.match.findUnique({
      where: {
        userAId_userBId: {
          userAId: userId1,
          userBId: userId2,
        },
      },
    });

    return !!match;
  }

  async unmatch(currentUserId: string, otherUserId: string) {
    const [userAId, userBId] =
      currentUserId < otherUserId
        ? [currentUserId, otherUserId]
        : [otherUserId, currentUserId];

    await this.prisma.$transaction(async (tx) => {
      await tx.match.deleteMany({ where: { userAId, userBId } });
      // Also clear the likes so either side can send a fresh match request later
      await tx.like.deleteMany({
        where: {
          OR: [
            { senderId: currentUserId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: currentUserId },
          ],
        },
      });
    });

    return { message: 'Unmatched successfully' };
  }

  async getEphemeralStatus(currentUserId: string, otherUserId: string) {
    const [userAId, userBId] =
      currentUserId < otherUserId
        ? [currentUserId, otherUserId]
        : [otherUserId, currentUserId];

    const match = await this.prisma.match.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    });

    if (!match) {
      return { active: false, mine: false };
    }

    const mine = currentUserId === userAId ? match.userAEphemeral : match.userBEphemeral;
    return { active: match.userAEphemeral || match.userBEphemeral, mine };
  }

  async setEphemeral(currentUserId: string, otherUserId: string, enabled: boolean) {
    const [userAId, userBId] =
      currentUserId < otherUserId
        ? [currentUserId, otherUserId]
        : [otherUserId, currentUserId];

    const data =
      currentUserId === userAId
        ? { userAEphemeral: enabled }
        : { userBEphemeral: enabled };

    const match = await this.prisma.match.update({
      where: { userAId_userBId: { userAId, userBId } },
      data,
    });

    return {
      active: match.userAEphemeral || match.userBEphemeral,
      mine: enabled,
    };
  }

  /** Whether a message sent right now between these two users should expire in 24h. */
  async isEphemeral(userAId: string, userBId: string): Promise<boolean> {
    const status = await this.getEphemeralStatus(userAId, userBId);
    return status.active;
  }
}
