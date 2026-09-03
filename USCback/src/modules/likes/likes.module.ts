import { Module } from '@nestjs/common';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';
import { BlocksModule } from '../blocks/blocks.module';
import { MatchesModule } from '../matches/matches.module';

@Module({
  imports: [BlocksModule, MatchesModule],
  controllers: [LikesController],
  providers: [LikesService],
  exports: [LikesService],
})
export class LikesModule {}
