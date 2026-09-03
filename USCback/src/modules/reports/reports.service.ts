import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ReportStatus } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';

export type ReportAction = 'dismiss' | 'resolve' | 'suspend_1w' | 'suspend_1m' | 'ban';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async createReport(
    reporterId: string,
    data: { reportedId: string; reason: any; details?: string },
  ) {
    if (reporterId === data.reportedId) {
      throw new BadRequestException('Cannot report yourself');
    }

    const reported = await this.prisma.user.findUnique({
      where: { id: data.reportedId },
    });
    if (!reported || reported.deletedAt) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.report.create({
      data: {
        reporterId,
        reportedId: data.reportedId,
        reason: data.reason,
        details: data.details,
      },
    });
  }

  async getReports(status?: ReportStatus) {
    const reports = await this.prisma.report.findMany({
      where: status ? { status } : undefined,
      include: {
        reporter: { select: { id: true, name: true, major: true } },
        reported: {
          select: {
            id: true,
            name: true,
            major: true,
            accountStatus: true,
            suspendedUntil: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (reports.length === 0) return [];

    const reportedIds = Array.from(new Set(reports.map((r) => r.reportedId)));
    const counts = await this.prisma.report.groupBy({
      by: ['reportedId'],
      where: { reportedId: { in: reportedIds } },
      _count: true,
    });
    const countMap = new Map(counts.map((c) => [c.reportedId, c._count]));

    return reports.map((r) => ({
      ...r,
      reportedTotalCount: countMap.get(r.reportedId) ?? 1,
    }));
  }

  async resolveReport(id: string, action: ReportAction) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (action === 'dismiss') {
      return this.prisma.report.update({ where: { id }, data: { status: 'DISMISSED' } });
    }

    if (action === 'resolve') {
      return this.prisma.report.update({ where: { id }, data: { status: 'RESOLVED' } });
    }

    const [, updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: report.reportedId },
        data:
          action === 'ban'
            ? { accountStatus: 'BANNED', suspendedUntil: null }
            : {
                accountStatus: 'SUSPENDED',
                suspendedUntil: new Date(
                  Date.now() + (action === 'suspend_1w' ? 7 : 30) * DAY_MS,
                ),
              },
      }),
      this.prisma.report.update({ where: { id }, data: { status: 'RESOLVED' } }),
    ]);

    return updated;
  }
}
