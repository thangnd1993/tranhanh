import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('root')
@Controller()
export class AppController {
  @Get()
  @ApiOkResponse({ description: 'Basic API identification.' })
  identify(): { name: string; version: string } {
    return { name: 'TraNhanh API', version: 'v1' };
  }
}
