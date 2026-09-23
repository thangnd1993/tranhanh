import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TrafficFinesModule } from '../traffic-fines/traffic-fines.module.js';
import { VehicleExpenseModule } from '../vehicle-expenses/vehicle-expenses.module.js';
import { VehicleDocumentsModule } from '../vehicle-documents/vehicle-documents.module.js';
import { VehiclesController } from './vehicles.controller.js';
import { VehicleDashboardService } from './vehicle-dashboard.service.js';
import { VehiclesService } from './vehicles.service.js';
import { PrivateResponseInterceptor } from './private-response.interceptor.js';

@Module({
  imports: [AuthModule, TrafficFinesModule, VehicleDocumentsModule, VehicleExpenseModule],
  controllers: [VehiclesController],
  providers: [VehiclesService, VehicleDashboardService, PrivateResponseInterceptor],
  exports: [VehiclesService],
})
export class VehiclesModule {}
