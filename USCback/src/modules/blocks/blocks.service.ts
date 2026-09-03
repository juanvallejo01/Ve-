import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MatchesService } from '../matches/matches.service';
import { resolveDisplayName } from '@/common/utils/display-name.util';

@Injectable()
export class BlocksService {
  constructor(
    private prisma: PrismaService,
    private matchesService: MatchesService,
  ) {}

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const blocked = await this.prisma.user.findUnique({ where: { id: blockedId } });
    if (!blocked || blocked.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const [userAId, userBId] =
      blockerId < blockedId ? [blockerId, blockedId] : [blockedId, blockerId];

    await this.prisma.$transaction(async (tx) => {
      await tx.block.upsert({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        create: { blockerId, blockedId },
        update: {},
      });

      // Blocking resets any existing match/likes so they start clean if ever unblocked
      await tx.match.deleteMany({
        where: { userAId, userBId },
      });
      await tx.like.deleteMany({
        where: {
          OR: [
            { senderId: blockerId, receiverId: blockedId },
            { senderId: blockedId, receiverId: blockerId },
          ],
        },
      });
    });

    return { message: 'User blocked' };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await this.prisma.block.deleteMany({
      where: { blockerId, blockedId },
    });

    return { message: 'User unblocked' };
  }

  async isBlocked(userAId: string, userBId: string): Promise<boolean> {
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userAId, blockedId: userBId },
          { blockerId: userBId, blockedId: userAId },
        ],
      },
    });

    return !!block;
  }

  async getRelationship(userAId: string, userBId: string) {
    const [blockedByMe, blockedMe] = await Promise.all([
      this.prisma.block.findUnique({
        where: { blockerId_blockedId: { blockerId: userAId, blockedId: userBId } },
      }),
      this.prisma.block.findUnique({
        where: { blockerId_blockedId: { blockerId: userBId, blockedId: userAId } },
      }),
    ]);

    return { blockedByMe: !!blockedByMe, blockedMe: !!blockedMe };
  }

  /** Solo la gente que YO bloqueé (para poder desbloquearla) — no incluye
   * a quienes me bloquearon a mí, ya que eso no se puede deshacer desde aquí. */
  async getBlockedByMe(userId: string) {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: { id: true, name: true, nickname: true, major: true, photoUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const matchedIds = await this.matchesService.getMatchedUserIds(userId);

    return blocks.map((b) => ({
      id: b.blocked.id,
      name: resolveDisplayName(b.blocked, userId, matchedIds),
      major: b.blocked.major,
      photoUrl: b.blocked.photoUrl,
      blockedAt: b.createdAt,
    }));
  }

  async getBlockedUserIds(userId: string): Promise<string[]> {
    const blocks = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });

    const ids = new Set<string>();
    for (const b of blocks) {
      ids.add(b.blockerId === userId ? b.blockedId : b.blockerId);
    }
    return Array.from(ids);
  }
}
