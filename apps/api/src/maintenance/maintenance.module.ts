import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { PrivateResponseInterceptor } from '../vehicles/private-response.interceptor.js';
import { MaintenanceController } from './maintenance.controller.js';
import { MaintenanceService } from './maintenance.service.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService, PrivateResponseInterceptor],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
