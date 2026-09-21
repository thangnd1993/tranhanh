import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  FuelPriceCurrentResponseDto,
  FuelPriceHistoryQueryDto,
  FuelPriceHistoryResponseDto,
} from './fuel-prices.dto.js';
import { FuelPricesService } from './fuel-prices.service.js';

@ApiTags('Fuel prices')
@Controller('fuel-prices')
export class FuelPricesController {
  constructor(private readonly service: FuelPricesService) {}
  @Get('current')
  @Header('Cache-Control', 'public, max-age=300, stale-if-error=86400')
  @ApiOperation({ summary: 'Current applicable official maximum retail fuel prices and exact change.' })
  @ApiOkResponse({ type: FuelPriceCurrentResponseDto })
  current() {
    return this.service.current();
  }

  @Get('history')
  @Header('Cache-Control', 'public, max-age=300, stale-if-error=86400')
  @ApiOperation({ summary: 'Bounded official fuel-price adjustment history, newest first.' })
  @ApiOkResponse({ type: FuelPriceHistoryResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid product, date range, or pagination.' })
  history(@Query() query: FuelPriceHistoryQueryDto) {
    return this.service.history(query);
  }
}
