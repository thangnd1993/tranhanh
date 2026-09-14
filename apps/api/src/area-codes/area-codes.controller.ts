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
import { AreaLookupDto, AreaCodeDto, AreaCodePageDto, AreaQueryDto } from './area-codes.dto.js';
import { AreaCodesService } from './area-codes.service.js';

@ApiTags('Area codes')
@ApiBadRequestResponse({ description: 'Invalid input, unsupported number format, or unknown query parameter.' })
@ApiServiceUnavailableResponse({ description: 'Database is temporarily unavailable.' })
@Controller('area-codes')
export class AreaCodesController {
  constructor(private readonly service: AreaCodesService) {}

  @Get()
  @ApiOperation({ summary: 'List reviewed codes; fixed code ASC ordering, bounded offset pagination.' })
  @ApiOkResponse({ type: AreaCodePageDto })
  list(@Query() query: AreaQueryDto): Promise<AreaCodePageDto> {
    return this.service.list(query);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search code/locality/group names; shares list filters and pagination.' })
  @ApiOkResponse({ type: AreaCodePageDto })
  search(@Query() query: AreaQueryDto): Promise<AreaCodePageDto> {
    return this.service.list(query);
  }

  @Get('lookup')
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @ApiOperation({
    summary: 'Normalize a geographic area code or current fixed-line number; never identifies a subscriber.',
  })
  @ApiOkResponse({ type: AreaCodeDto })
  @ApiNotFoundResponse({ description: 'Structurally valid candidate is absent from the reviewed dataset.' })
  lookup(@Query() query: AreaLookupDto): Promise<AreaCodeDto> {
    return this.service.lookup(query.value);
  }

  @Get(':code/related')
  @ApiParam({ name: 'code', example: '0236', description: 'Domestic 0 plus 1–3 digits; includes legacy 04/08.' })
  @ApiOperation({
    summary: 'Historical/same-area and active same-group codes, excluding the requested code; at most 20.',
  })
  @ApiOkResponse({ type: [AreaCodeDto] })
  @ApiNotFoundResponse({ description: 'Unknown code.' })
  related(@Param('code') code: string): Promise<AreaCodeDto[]> {
    return this.service.related(code);
  }

  @Get(':code')
  @ApiParam({
    name: 'code',
    example: '0236',
    description: 'Domestic geographic code including trunk zero; full numbers belong in lookup.',
  })
  @ApiOperation({
    summary:
      'Exact geographic assignment, including legacy replacement, source-era locality and reviewed telecom group.',
  })
  @ApiOkResponse({ type: AreaCodeDto })
  @ApiNotFoundResponse({ description: 'Unknown code.' })
  exact(@Param('code') code: string): Promise<AreaCodeDto> {
    return this.service.exact(code);
  }
}
