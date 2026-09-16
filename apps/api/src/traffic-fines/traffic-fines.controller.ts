import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type { TrafficFineLookupResponse } from '@tranhanh/shared';
import { TrafficFineRateLimitGuard } from './traffic-fine-rate-limit.guard.js';
import { TrafficFineResponseInterceptor } from './traffic-fine-response.interceptor.js';
import { TrafficFineLookupDto } from './traffic-fines.dto.js';
import { TrafficFinesService } from './traffic-fines.service.js';

@ApiTags('Traffic fines')
@Controller('traffic-fines')
@UseGuards(TrafficFineRateLimitGuard)
@UseInterceptors(TrafficFineResponseInterceptor)
export class TrafficFinesController {
  constructor(private readonly trafficFines: TrafficFinesService) {}

  @Post('lookup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check a full plate through a privacy-safe provider abstraction.',
    description:
      'Public endpoint. The plate remains in the POST body and is returned only in masked form. The current official source requires manual CAPTCHA verification; no CAPTCHA bypass or scraper is used. A no-record result never guarantees that no violation exists outside source coverage.',
  })
  @ApiOkResponse({
    description:
      'Explicit result, no-matching-record, manual-verification, or unsupported outcome with source and limitation metadata.',
  })
  @ApiBadRequestResponse({ description: 'Malformed full plate, vehicle type, or unexpected field.' })
  @ApiTooManyRequestsResponse({ description: 'Anonymous per-process request limit exceeded.' })
  @ApiBadGatewayResponse({ description: 'Provider returned a malformed response; upstream content is not exposed.' })
  @ApiServiceUnavailableResponse({
    description: 'Provider unavailable, timed out, degraded, or upstream-rate-limited.',
  })
  lookup(@Body() input: TrafficFineLookupDto): Promise<TrafficFineLookupResponse> {
    return this.trafficFines.lookup(input);
  }
}
