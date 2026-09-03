import { Controller, Get, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import { MatchesService } from './matches.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

class SetEphemeralDto {
  @IsBoolean()
  enabled!: boolean;
}

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(private matchesService: MatchesService) {}

  @Get()
  getMatches(@CurrentUser() user: any) {
    return this.matchesService.getMatches(user.id);
  }

  @Delete('user/:userId')
  unmatch(@CurrentUser() user: any, @Param('userId') userId: string) {
    return this.matchesService.unmatch(user.id, userId);
  }

  @Get('user/:userId/ephemeral')
  getEphemeral(@CurrentUser() user: any, @Param('userId') userId: string) {
    return this.matchesService.getEphemeralStatus(user.id, userId);
  }

  @Patch('user/:userId/ephemeral')
  setEphemeral(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
    @Body() dto: SetEphemeralDto,
  ) {
    return this.matchesService.setEphemeral(user.id, userId, dto.enabled);
  }
}
