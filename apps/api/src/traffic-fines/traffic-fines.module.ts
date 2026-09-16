import { Module } from '@nestjs/common';
import { ManualTrafficFineProvider } from './manual-traffic-fine.provider.js';
import { TRAFFIC_FINE_PROVIDER } from './traffic-fine-provider.js';
import { TrafficFineRateLimitGuard } from './traffic-fine-rate-limit.guard.js';
import { TrafficFineResponseInterceptor } from './traffic-fine-response.interceptor.js';
import { TrafficFinesController } from './traffic-fines.controller.js';
import { TrafficFinesService } from './traffic-fines.service.js';

@Module({
  controllers: [TrafficFinesController],
  providers: [
    TrafficFinesService,
    TrafficFineRateLimitGuard,
    TrafficFineResponseInterceptor,
    ManualTrafficFineProvider,
    { provide: TRAFFIC_FINE_PROVIDER, useExisting: ManualTrafficFineProvider },
  ],
  exports: [TrafficFinesService, TRAFFIC_FINE_PROVIDER],
})
export class TrafficFinesModule {}
