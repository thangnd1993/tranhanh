import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import type { HealthResponse, ReadinessResponse } from '@tranhanh/shared';
import { HealthService } from './health.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOkResponse({ description: 'The API process is running.' })
  liveness(): HealthResponse {
    return this.health.liveness();
  }

  @Get('ready')
  @ApiOkResponse({ description: 'PostgreSQL and Redis are reachable.' })
  @ApiServiceUnavailableResponse({ description: 'A required dependency is unavailable.' })
  async readiness(): Promise<ReadinessResponse> {
    const result = await this.health.readiness();
    if (result.status !== 'ok') {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }
}
