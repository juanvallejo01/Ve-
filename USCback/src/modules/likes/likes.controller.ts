import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { LikesService } from './likes.service';
import { CreateLikeDto } from './dto/create-like.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('likes')
@UseGuards(JwtAuthGuard)
export class LikesController {
  constructor(private likesService: LikesService) {}

  @Post()
  createLike(@CurrentUser() user: any, @Body() dto: CreateLikeDto) {
    return this.likesService.createLike(user.id, dto.receiverId);
  }

  @Get('sent')
  getLikesSent(@CurrentUser() user: any) {
    return this.likesService.getLikesSent(user.id);
  }

  @Get('received')
  getLikesReceived(@CurrentUser() user: any) {
    return this.likesService.getLikesReceived(user.id);
  }
}
