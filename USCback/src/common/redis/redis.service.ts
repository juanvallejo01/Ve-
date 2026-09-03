import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType | null = null;
  private readonly logger = new Logger(RedisService.name);
  private connected = false;
  private disabled = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('redis.host');
    const port = this.configService.get<number>('redis.port');

    if (!host) {
      this.logger.warn('Redis not configured — running without Redis');
      this.disabled = true;
      return;
    }

    try {
      this.client = createClient({
        socket: {
          host,
          port,
          connectTimeout: 3000,
          reconnectStrategy: (retries) => {
            if (retries > 2) {
              this.logger.warn('Redis unavailable after 3 attempts — disabling Redis');
              this.disabled = true;
              return false as unknown as number; // stop reconnecting
            }
            return Math.min(retries * 500, 2000);
          },
        },
      });

      // Silently handle errors — no more spam
      this.client.on('error', () => {});

      await Promise.race([
        this.client.connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), 4000),
        ),
      ]);

      this.connected = true;
      this.logger.log('Redis connected successfully');
    } catch {
      this.logger.warn('Redis connection failed — running without Redis');
      this.connected = false;
      this.disabled = true;
      // Destroy the client so it stops trying
      if (this.client) {
        try {
          this.client.removeAllListeners();
          await this.client.disconnect().catch(() => {});
        } catch {
          // ignore
        }
        this.client = null;
      }
    }
  }

  async onModuleDestroy() {
    if (this.client && this.connected) {
      try {
        await this.client.quit();
      } catch {
        // ignore
      }
    }
    this.client = null;
    this.connected = false;
  }

  async get(key: string): Promise<string | null> {
    if (this.disabled || !this.connected || !this.client) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (this.disabled || !this.connected || !this.client) return;
    try {
      if (ttl) {
        await this.client.set(key, value, { EX: ttl });
      } else {
        await this.client.set(key, value);
      }
    } catch {
      // Silently fail if Redis is not available
    }
  }

  async del(key: string): Promise<void> {
    if (this.disabled || !this.connected || !this.client) return;
    try {
      await this.client.del(key);
    } catch {
      // Silently fail
    }
  }

  async incr(key: string): Promise<number> {
    if (this.disabled || !this.connected || !this.client) return 0;
    try {
      return await this.client.incr(key);
    } catch {
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (this.disabled || !this.connected || !this.client) return;
    try {
      await this.client.expire(key, seconds);
    } catch {
      // Silently fail
    }
  }

  async ttl(key: string): Promise<number> {
    if (this.disabled || !this.connected || !this.client) return -1;
    try {
      return await this.client.ttl(key);
    } catch {
      return -1;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (this.disabled || !this.connected || !this.client) return false;
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch {
      return false;
    }
  }

  // Rate limiting helper
  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    if (this.disabled || !this.connected || !this.client) {
      // If Redis is not available, allow all requests
      return {
        allowed: true,
        remaining: limit,
        resetAt: new Date(Date.now() + windowSeconds * 1000),
      };
    }

    try {
      const count = await this.incr(key);

      if (count === 1) {
        await this.expire(key, windowSeconds);
      }

      const ttl = await this.ttl(key);
      const resetAt = new Date(Date.now() + ttl * 1000);

      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetAt,
      };
    } catch {
      // Fallback if any error
      return {
        allowed: true,
        remaining: limit,
        resetAt: new Date(Date.now() + windowSeconds * 1000),
      };
    }
  }
}
