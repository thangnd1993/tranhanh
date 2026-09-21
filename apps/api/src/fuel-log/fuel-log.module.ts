import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrivateResponseInterceptor } from '../vehicles/private-response.interceptor.js';
import { FuelLogController } from './fuel-log.controller.js';
import { FuelLogService } from './fuel-log.service.js';
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [FuelLogController],
  providers: [FuelLogService, PrivateResponseInterceptor],
  exports: [FuelLogService],
})
export class FuelLogModule {}
