import {
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';

import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT),
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    });
  }

  async query(sql: string, params: any[] = []) {
    return this.pool.query(sql, params);
  }

  async getClient() {
    return this.pool.connect();
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}

