import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService) {
    const connectionString = config.getOrThrow<string>('DATABASE_URL');
    const schema = new URL(connectionString).searchParams.get('schema') ?? 'public';
    super({ adapter: new PrismaPg({ connectionString }, { schema }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
