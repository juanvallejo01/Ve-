import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { SetTypingDto } from './dto/set-typing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post()
  sendMessage(@CurrentUser() user: any, @Body() dto: CreateMessageDto) {
    return this.chatService.sendMessage(user.id, dto.receiverId, dto.content);
  }

  @Post('screenshot/:userId')
  reportScreenshot(@CurrentUser() user: any, @Param('userId') userId: string) {
    return this.chatService.reportScreenshot(user.id, userId);
  }

  @Post('typing/:userId')
  setTyping(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
    @Body() dto: SetTypingDto,
  ) {
    return this.chatService.setTyping(user.id, userId, dto.isTyping);
  }

  @Get('typing/:userId')
  getTypingStatus(@CurrentUser() user: any, @Param('userId') userId: string) {
    return this.chatService.getTypingStatus(user.id, userId);
  }

  @Get('conversations')
  getConversations(@CurrentUser() user: any) {
    return this.chatService.getConversations(user.id);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: any) {
    return this.chatService.getUnreadMessagesCount(user.id);
  }

  @Get('conversation/:userId')
  getConversation(@CurrentUser() user: any, @Param('userId') userId: string) {
    return this.chatService.getConversation(user.id, userId);
  }
}
