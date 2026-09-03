import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { BlocksService } from './blocks.service';
import { CreateBlockDto } from './dto/create-block.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('blocks')
@UseGuards(JwtAuthGuard)
export class BlocksController {
  constructor(private blocksService: BlocksService) {}

  @Get()
  getBlockedUsers(@CurrentUser() user: any) {
    return this.blocksService.getBlockedByMe(user.id);
  }

  @Post()
  blockUser(@CurrentUser() user: any, @Body() dto: CreateBlockDto) {
    return this.blocksService.blockUser(user.id, dto.blockedId);
  }

  @Delete(':blockedId')
  unblockUser(@CurrentUser() user: any, @Param('blockedId') blockedId: string) {
    return this.blocksService.unblockUser(user.id, blockedId);
  }
}
