import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { TypingService } from './typing.service';
import { MatchesModule } from '../matches/matches.module';

@Module({
  imports: [MatchesModule],
  controllers: [ChatController],
  providers: [ChatService, TypingService],
  exports: [ChatService],
})
export class ChatModule {}
