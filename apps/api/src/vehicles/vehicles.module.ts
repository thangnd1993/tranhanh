import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { VehiclesController } from './vehicles.controller.js';
import { VehiclesService } from './vehicles.service.js';
import { PrivateResponseInterceptor } from './private-response.interceptor.js';

@Module({
  imports: [AuthModule],
  controllers: [VehiclesController],
  providers: [VehiclesService, PrivateResponseInterceptor],
  exports: [VehiclesService],
})
export class VehiclesModule {}
