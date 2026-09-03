import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { ReportStatus, UserRole } from '@prisma/client';
import { ReportsService, ReportAction } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

const REPORT_ACTIONS: ReportAction[] = [
  'dismiss',
  'resolve',
  'suspend_1w',
  'suspend_1m',
  'ban',
];

class ResolveReportDto {
  @IsIn(REPORT_ACTIONS)
  action!: ReportAction;
}

@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get()
  getReports(@Query('status') status?: ReportStatus) {
    return this.reportsService.getReports(status);
  }

  @Patch(':id')
  resolveReport(@Param('id') id: string, @Body() dto: ResolveReportDto) {
    return this.reportsService.resolveReport(id, dto.action);
  }
}
