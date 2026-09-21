import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiCookieAuth, ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser, FuelLogEntryResult, FuelLogListResult, FuelLogSummary } from '@tranhanh/shared';
import { AccessAuthGuard, CsrfGuard, CurrentUser, TrustedOriginGuard } from '../auth/auth.guards.js';
import { PrivateResponseInterceptor } from '../vehicles/private-response.interceptor.js';
import {
  CreateFuelLogEntryDto,
  FuelLogListQueryDto,
  FuelLogSummaryQueryDto,
  UpdateFuelLogEntryDto,
} from './fuel-log.dto.js';
import { FuelLogService } from './fuel-log.service.js';

@ApiTags('Fuel Log')
@ApiCookieAuth('tn_access')
@ApiNotFoundResponse({ description: 'The private vehicle or fuel entry was not found for this owner.' })
@Controller('vehicles/:vehicleId/fuel-logs')
@UseGuards(TrustedOriginGuard, AccessAuthGuard)
@UseInterceptors(PrivateResponseInterceptor)
export class FuelLogController {
  constructor(private readonly fuelLog: FuelLogService) {}
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Query() query: FuelLogListQueryDto,
  ): Promise<FuelLogListResult> {
    return this.fuelLog.list(user.id, vehicleId, query);
  }
  @Post()
  @UseGuards(CsrfGuard)
  create(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Body() input: CreateFuelLogEntryDto,
  ): Promise<FuelLogEntryResult> {
    return this.fuelLog.create(user.id, vehicleId, input);
  }
  @Get('summary')
  summary(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Query() query: FuelLogSummaryQueryDto,
  ): Promise<FuelLogSummary> {
    return this.fuelLog.summary(user.id, vehicleId, query.month);
  }
  @Get(':entryId')
  get(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Param('entryId') entryId: string,
  ): Promise<FuelLogEntryResult> {
    return this.fuelLog.get(user.id, vehicleId, entryId);
  }
  @Patch(':entryId')
  @UseGuards(CsrfGuard)
  update(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Param('entryId') entryId: string,
    @Body() input: UpdateFuelLogEntryDto,
  ): Promise<FuelLogEntryResult> {
    return this.fuelLog.update(user.id, vehicleId, entryId, input);
  }
  @Post(':entryId/archive')
  @UseGuards(CsrfGuard)
  archive(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Param('entryId') entryId: string,
  ): Promise<FuelLogEntryResult> {
    return this.fuelLog.archive(user.id, vehicleId, entryId);
  }
  @Post(':entryId/restore')
  @UseGuards(CsrfGuard)
  restore(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Param('entryId') entryId: string,
  ): Promise<FuelLogEntryResult> {
    return this.fuelLog.restore(user.id, vehicleId, entryId);
  }
}
