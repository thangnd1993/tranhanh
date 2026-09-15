import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  VehiclePlateAllocationDto,
  VehiclePlateLookupQueryDto,
  VehiclePlateLookupResultDto,
  VehiclePlatePageDto,
  VehiclePlateQueryDto,
} from './vehicle-plates.dto.js';
import { VehiclePlatesService } from './vehicle-plates.service.js';

@ApiTags('Vehicle plates')
@ApiBadRequestResponse({ description: 'Invalid input or unknown query parameter.' })
@ApiServiceUnavailableResponse({ description: 'Database is temporarily unavailable.' })
@Controller('vehicle-plates')
export class VehiclePlatesController {
  constructor(private readonly service: VehiclePlatesService) {}
  @Get()
  @ApiOperation({ summary: 'List reviewed public vehicle-plate allocations with bounded pagination.' })
  @ApiOkResponse({ type: VehiclePlatePageDto })
  list(@Query() query: VehiclePlateQueryDto): Promise<VehiclePlatePageDto> {
    return this.service.list(query);
  }
  @Get('search')
  @ApiOperation({ summary: 'Search numeric prefixes and allocation-target names.' })
  @ApiOkResponse({ type: VehiclePlatePageDto })
  search(@Query() query: VehiclePlateQueryDto): Promise<VehiclePlatePageDto> {
    return this.service.list(query);
  }
  @Get('lookup')
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @ApiOperation({
    summary: 'Extract a public prefix from common plate input; never identifies or retains a vehicle or owner.',
  })
  @ApiOkResponse({ type: VehiclePlateLookupResultDto })
  @ApiNotFoundResponse({ description: 'Unknown numeric prefix.' })
  lookup(@Query() query: VehiclePlateLookupQueryDto): Promise<VehiclePlateLookupResultDto> {
    return this.service.lookup(query.value);
  }
  @Get(':prefix/related')
  @ApiParam({
    name: 'prefix',
    example: '51K',
    description: 'Numeric prefix with optional public series; full plates are rejected.',
  })
  @ApiOperation({ summary: 'Other active prefixes assigned to the same current target; at most 20.' })
  @ApiOkResponse({ type: [VehiclePlateAllocationDto] })
  @ApiNotFoundResponse({ description: 'Unknown numeric prefix.' })
  related(@Param('prefix') prefix: string): Promise<VehiclePlateAllocationDto[]> {
    return this.service.related(prefix);
  }
  @Get(':prefix')
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @ApiParam({
    name: 'prefix',
    example: '51K',
    description: 'Two-digit prefix with optional one/two-character public series.',
  })
  @ApiOperation({ summary: 'Resolve a numeric allocation prefix; returns all matches if allocation is ambiguous.' })
  @ApiOkResponse({ type: VehiclePlateLookupResultDto })
  @ApiNotFoundResponse({ description: 'Unknown numeric prefix.' })
  exact(@Param('prefix') prefix: string): Promise<VehiclePlateLookupResultDto> {
    return this.service.exact(prefix);
  }
}
