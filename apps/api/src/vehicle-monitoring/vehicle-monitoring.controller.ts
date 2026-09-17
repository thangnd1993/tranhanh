import { Controller, Get, Param, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiCookieAuth, ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser, VehicleMonitoringHistoryResult, VehicleMonitoringResult } from '@tranhanh/shared';
import { AccessAuthGuard, CsrfGuard, CurrentUser, TrustedOriginGuard } from '../auth/auth.guards.js';
import { PrivateResponseInterceptor } from '../vehicles/private-response.interceptor.js';
import { VehicleMonitoringService } from './vehicle-monitoring.service.js';
@ApiTags('Vehicle Monitoring')
@ApiCookieAuth('tn_access')
@ApiNotFoundResponse({ description: 'The vehicle or monitoring configuration does not exist for this owner.' })
@Controller('vehicles/:vehicleId/monitoring')
@UseGuards(TrustedOriginGuard, AccessAuthGuard)
@UseInterceptors(PrivateResponseInterceptor)
export class VehicleMonitoringController {
  constructor(private readonly monitoring: VehicleMonitoringService) {}
  @Get() get(@CurrentUser() user: AuthUser, @Param('vehicleId') vehicleId: string): Promise<VehicleMonitoringResult> {
    return this.monitoring.get(user.id, vehicleId);
  }
  @Post('enable') @UseGuards(CsrfGuard) enable(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
  ): Promise<VehicleMonitoringResult> {
    return this.monitoring.setEnabled(user.id, vehicleId, true);
  }
  @Post('disable') @UseGuards(CsrfGuard) disable(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
  ): Promise<VehicleMonitoringResult> {
    return this.monitoring.setEnabled(user.id, vehicleId, false);
  }
  @Get('history') history(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
  ): Promise<VehicleMonitoringHistoryResult> {
    return this.monitoring.history(user.id, vehicleId);
  }
}
