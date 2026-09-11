import type { NestExpressApplication } from '@nestjs/platform-express';
import { bigintJsonReplacer } from './bigint-json.js';

export function configureDatabaseHttp(app: NestExpressApplication): void {
  app.set('json replacer', bigintJsonReplacer);
}
