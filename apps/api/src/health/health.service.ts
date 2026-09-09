import { Injectable } from '@nestjs/common';
import type { HealthResponse, ReadinessResponse, ServiceStatus } from '@tranhanh/shared';
import { PrismaService } from '../database/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  liveness(): HealthResponse {
    return {
      service: 'tranhanh-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async readiness(): Promise<ReadinessResponse> {
    const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);
    return {
      checks: { database, redis },
      service: 'tranhanh-api',
      status: database === 'ok' && redis === 'ok' ? 'ok' : 'unavailable',
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<ServiceStatus> {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return 'ok';
    } catch {
      return 'unavailable';
    }
  }

  private async checkRedis(): Promise<ServiceStatus> {
    try {
      return (await this.redis.ping()) === 'PONG' ? 'ok' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  }
}
