import { Controller, Get, Param, Query } from '@nestjs/common';
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
  PostalCodeLookupQueryDto,
  PostalCodeLookupResultDto,
  PostalCodePageDto,
  PostalCodeQueryDto,
} from './postal-codes.dto.js';
import { PostalCodesService } from './postal-codes.service.js';
@ApiTags('Postal codes')
@ApiBadRequestResponse({ description: 'Malformed code, invalid pagination, or unsupported query parameter.' })
@ApiServiceUnavailableResponse({ description: 'Database is temporarily unavailable.' })
@Controller('postal-codes')
export class PostalCodesController {
  constructor(private readonly service: PostalCodesService) {}
  @Get()
  @ApiOperation({ summary: 'List current source-backed postal assignments with bounded pagination.' })
  @ApiOkResponse({ type: PostalCodePageDto })
  list(@Query() query: PostalCodeQueryDto) {
    return this.service.list(query);
  }
  @Get('search')
  @ApiOperation({ summary: 'Search code, locality aliases, or province/city accent-insensitively.' })
  @ApiOkResponse({ type: PostalCodePageDto })
  search(@Query() query: PostalCodeQueryDto) {
    return this.service.list(query);
  }
  @Get('lookup')
  @ApiOperation({ summary: 'Resolve a five-digit code or locality; ambiguous localities return all matches.' })
  @ApiOkResponse({ type: PostalCodeLookupResultDto })
  @ApiNotFoundResponse({ description: 'Unknown code or locality.' })
  lookup(@Query() query: PostalCodeLookupQueryDto) {
    return this.service.lookup(query.q);
  }
  @Get(':code/related')
  @ApiParam({ name: 'code', example: '50206', description: 'Exactly five digits.' })
  @ApiOperation({ summary: 'Return up to 20 active sibling assignments in the same official province/city.' })
  @ApiOkResponse({ type: PostalCodePageDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Unknown well-formed code.' })
  related(@Param('code') code: string) {
    return this.service.related(code);
  }
  @Get(':code')
  @ApiParam({ name: 'code', example: '50206', description: 'Exactly five digits; leading zeroes are significant.' })
  @ApiOperation({ summary: 'Resolve an exact postal code without guessing.' })
  @ApiOkResponse({ type: PostalCodeLookupResultDto })
  @ApiNotFoundResponse({ description: 'Unknown well-formed code.' })
  exact(@Param('code') code: string) {
    return this.service.exact(code);
  }
}
