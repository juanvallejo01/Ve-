import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

// Errores de conexión transitorios: Neon cierra conexiones inactivas y
// "despierta" la base con unos segundos de retraso. Vale la pena reintentar
// una vez; cualquier otro error (SQL, constraint…) se propaga tal cual.
const TRANSIENT_ERRORS = ['ETIMEDOUT', 'ECONNRESET', 'EPIPE', '57P01'];
function isTransient(error: any): boolean {
  return (
    TRANSIENT_ERRORS.includes(error?.code) ||
    /Connection terminated|timeout exceeded when trying to connect/i.test(error?.message ?? '')
  );
}

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
      // Neon tarda unos segundos en despertar si estaba suspendida.
      connectionTimeoutMillis: 10000,
      keepAlive: true,
    });
    // Sin este handler, una conexión inactiva que el servidor corta emite un
    // 'error' no manejado y Node termina el proceso (el backend se cae).
    this.pool.on('error', (error) => {
      this.logger.warn(`Conexión inactiva de PostgreSQL cerrada: ${error.message}`);
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

  async query(text: string, params?: any[], isRetry = false): Promise<any> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      this.logger.debug(`Executed query in ${duration}ms`);
      return result;
    } catch (error: any) {
      if (!isRetry && isTransient(error)) {
        this.logger.warn(`Conexión perdida (${error?.code || error?.message}); reintentando una vez`);
        return this.query(text, params, true);
      }
      this.logger.error('Query error:', error?.message || 'Unknown error');
      throw error;
    }
  }

  async getClient() {
    return this.pool.connect();
  }
}
