import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(config: ConfigService) {
    const password = config.get<string>('REDIS_PASSWORD');
    this.client = new Redis({
      host: config.getOrThrow<string>('REDIS_HOST'),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      password: password || undefined,
      port: config.getOrThrow<number>('REDIS_PORT'),
    });
  }

  async ping(): Promise<string> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
    return this.client.ping();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'ready') {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
      return;
    }
    if (this.client.status !== 'end' && this.client.status !== 'wait') {
      this.client.disconnect();
    }
  }
}
