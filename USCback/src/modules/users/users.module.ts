import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { BlocksModule } from '../blocks/blocks.module';
import { MatchesModule } from '../matches/matches.module';

@Module({
  imports: [BlocksModule, MatchesModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
