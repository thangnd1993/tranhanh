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
import { PhoneLookupDto, PhonePrefixDto, PhonePrefixPageDto, PhoneQueryDto } from './phone-prefixes.dto.js';
import { PhonePrefixesService } from './phone-prefixes.service.js';

@ApiTags('Phone prefixes')
@ApiBadRequestResponse({ description: 'Invalid input, unsupported number format, or unknown query parameter.' })
@ApiServiceUnavailableResponse({ description: 'Database is temporarily unavailable.' })
@Controller('phone-prefixes')
export class PhonePrefixesController {
  constructor(private readonly service: PhonePrefixesService) {}

  @Get()
  @ApiOperation({ summary: 'List reviewed prefixes; fixed prefix ASC ordering, bounded offset pagination.' })
  @ApiOkResponse({ type: PhonePrefixPageDto })
  list(@Query() query: PhoneQueryDto): Promise<PhonePrefixPageDto> {
    return this.service.list(query);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search prefix/operator names; shares list filters and pagination.' })
  @ApiOkResponse({ type: PhonePrefixPageDto })
  search(@Query() query: PhoneQueryDto): Promise<PhonePrefixPageDto> {
    return this.service.list(query);
  }

  @Get('lookup')
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @ApiOperation({ summary: 'Extract a mobile prefix only; does not identify subscribers or their current network.' })
  @ApiOkResponse({ type: PhonePrefixDto })
  @ApiNotFoundResponse({ description: 'Structurally valid candidate is absent from the reviewed dataset.' })
  lookup(@Query() query: PhoneLookupDto): Promise<PhonePrefixDto> {
    return this.service.lookup(query.value);
  }

  @Get(':prefix/related')
  @ApiParam({ name: 'prefix', example: '086', description: 'Exactly 3 or 4 digits.' })
  @ApiOperation({ summary: 'Up to 12 active prefixes of the same allocated operator, sorted by prefix.' })
  @ApiOkResponse({ type: [PhonePrefixDto] })
  @ApiNotFoundResponse({ description: 'Unknown prefix.' })
  related(@Param('prefix') prefix: string): Promise<PhonePrefixDto[]> {
    return this.service.related(prefix);
  }

  @Get(':prefix')
  @ApiParam({ name: 'prefix', example: '086', description: 'Exactly 3 or 4 digits; full numbers belong in lookup.' })
  @ApiOperation({ summary: 'Exact allocation lookup, including explicit legacy replacement and source evidence.' })
  @ApiOkResponse({ type: PhonePrefixDto })
  @ApiNotFoundResponse({ description: 'Unknown prefix.' })
  exact(@Param('prefix') prefix: string): Promise<PhonePrefixDto> {
    return this.service.exact(prefix);
  }
}
