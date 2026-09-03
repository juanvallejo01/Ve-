import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PostgresService } from '../database/postgres.service';

@Global()
@Module({
  providers: [PrismaService, PostgresService],
  exports: [PrismaService, PostgresService],
})
export class PrismaModule {}
