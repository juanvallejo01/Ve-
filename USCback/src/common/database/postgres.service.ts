import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class PostgresService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostgresService.name);
  private pool: Pool;

  constructor(private configService: ConfigService) {
    const connectionString = this.configService.get<string>('database.url');
    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    this.logger.log('PostgreSQL pool configured from DATABASE_URL');
  }

  async onModuleInit() {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.logger.log('PostgreSQL connected successfully');
    } catch (error: any) {
      this.logger.error(
        'PostgreSQL connection failed:',
        error?.message || 'Unknown error',
      );
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      this.logger.debug(`Executed query in ${duration}ms`);
      return result;
    } catch (error: any) {
      this.logger.error('Query error:', error?.message || 'Unknown error');
      throw error;
    }
  }

  async getClient() {
    return this.pool.connect();
  }
}
