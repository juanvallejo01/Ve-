import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  @Get()
  getLeaderboard(@Query('limit') limit?: string) {
    return this.leaderboardService.getLeaderboard(limit ? parseInt(limit) : 10);
  }

  @Get('users')
  getUsersRanking(@Query('limit') limit?: string) {
    return this.leaderboardService.getUsersRanking(limit ? parseInt(limit) : 10);
  }

  @Get('posts')
  getPostsRanking(@Query('limit') limit?: string) {
    return this.leaderboardService.getPostsRanking(limit ? parseInt(limit) : 10);
  }

  @Get('my-rank')
  getMyRank(@CurrentUser() user: any) {
    return this.leaderboardService.getUserRank(user.id);
  }
}
