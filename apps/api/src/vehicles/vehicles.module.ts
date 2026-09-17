import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { VehicleDocumentsModule } from '../vehicle-documents/vehicle-documents.module.js';
import { VehiclesController } from './vehicles.controller.js';
import { VehiclesService } from './vehicles.service.js';
import { PrivateResponseInterceptor } from './private-response.interceptor.js';

@Module({
  imports: [AuthModule, VehicleDocumentsModule],
  controllers: [VehiclesController],
  providers: [VehiclesService, PrivateResponseInterceptor],
  exports: [VehiclesService],
})
export class VehiclesModule {}
