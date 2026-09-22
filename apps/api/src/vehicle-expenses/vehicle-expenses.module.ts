import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { PrivateResponseInterceptor } from '../vehicles/private-response.interceptor.js';
import { VehicleExpenseController } from './vehicle-expenses.controller.js';
import { VehicleExpenseService } from './vehicle-expenses.service.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [VehicleExpenseController],
  providers: [VehicleExpenseService, PrivateResponseInterceptor],
  exports: [VehicleExpenseService],
})
export class VehicleExpenseModule {}
