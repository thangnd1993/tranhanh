import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiCookieAuth, ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import type {
  AuthUser,
  MaintenanceCompletionResult,
  MaintenanceHistoryListResult,
  MaintenanceHistoryResult,
  MaintenancePlanListResult,
  MaintenancePlanResult,
  MaintenanceSummary,
} from '@tranhanh/shared';
import { AccessAuthGuard, CsrfGuard, CurrentUser, TrustedOriginGuard } from '../auth/auth.guards.js';
import { PrivateResponseInterceptor } from '../vehicles/private-response.interceptor.js';
import {
  CompleteMaintenancePlanDto,
  CreateMaintenanceHistoryDto,
  CreateMaintenancePlanDto,
  MaintenanceHistoryListQueryDto,
  MaintenancePlanListQueryDto,
  UpdateMaintenanceHistoryDto,
  UpdateMaintenancePlanDto,
} from './maintenance.dto.js';
import { MaintenanceService } from './maintenance.service.js';

@ApiTags('Vehicle Maintenance')
@ApiCookieAuth('tn_access')
@ApiNotFoundResponse({ description: 'The private vehicle or maintenance record was not found for this owner.' })
@Controller('vehicles/:vehicleId/maintenance')
@UseGuards(TrustedOriginGuard, AccessAuthGuard)
@UseInterceptors(PrivateResponseInterceptor)
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthUser, @Param('vehicleId') vehicleId: string): Promise<MaintenanceSummary> {
    return this.maintenance.summary(user.id, vehicleId);
  }

  @Get('history')
  listHistory(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Query() query: MaintenanceHistoryListQueryDto,
  ): Promise<MaintenanceHistoryListResult> {
    return this.maintenance.listHistory(user.id, vehicleId, query);
  }

  @Post('history')
  @UseGuards(CsrfGuard)
  createHistory(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Body() input: CreateMaintenanceHistoryDto,
  ): Promise<MaintenanceHistoryResult> {
    return this.maintenance.createHistory(user.id, vehicleId, input);
  }

  @Get('history/:historyId')
  getHistory(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Param('historyId') historyId: string,
  ): Promise<MaintenanceHistoryResult> {
    return this.maintenance.getHistory(user.id, vehicleId, historyId);
  }

  @Patch('history/:historyId')
  @UseGuards(CsrfGuard)
  updateHistory(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Param('historyId') historyId: string,
    @Body() input: UpdateMaintenanceHistoryDto,
  ): Promise<MaintenanceHistoryResult> {
    return this.maintenance.updateHistory(user.id, vehicleId, historyId, input);
  }

  @Post('history/:historyId/archive')
  @UseGuards(CsrfGuard)
  archiveHistory(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Param('historyId') historyId: string,
  ): Promise<MaintenanceHistoryResult> {
    return this.maintenance.archiveHistory(user.id, vehicleId, historyId);
  }

  @Post('history/:historyId/restore')
  @UseGuards(CsrfGuard)
  restoreHistory(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Param('historyId') historyId: string,
  ): Promise<MaintenanceHistoryResult> {
    return this.maintenance.restoreHistory(user.id, vehicleId, historyId);
  }

  @Get('plans')
  listPlans(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Query() query: MaintenancePlanListQueryDto,
  ): Promise<MaintenancePlanListResult> {
    return this.maintenance.listPlans(user.id, vehicleId, query);
  }

  @Post('plans')
  @UseGuards(CsrfGuard)
  createPlan(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Body() input: CreateMaintenancePlanDto,
  ): Promise<MaintenancePlanResult> {
    return this.maintenance.createPlan(user.id, vehicleId, input);
  }

  @Get('plans/:planId')
  getPlan(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Param('planId') planId: string,
  ): Promise<MaintenancePlanResult> {
    return this.maintenance.getPlan(user.id, vehicleId, planId);
  }

  @Patch('plans/:planId')
  @UseGuards(CsrfGuard)
  updatePlan(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Param('planId') planId: string,
    @Body() input: UpdateMaintenancePlanDto,
  ): Promise<MaintenancePlanResult> {
    return this.maintenance.updatePlan(user.id, vehicleId, planId, input);
  }

  @Post('plans/:planId/archive')
  @UseGuards(CsrfGuard)
  archivePlan(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Param('planId') planId: string,
  ): Promise<MaintenancePlanResult> {
    return this.maintenance.archivePlan(user.id, vehicleId, planId);
  }

  @Post('plans/:planId/restore')
  @UseGuards(CsrfGuard)
  restorePlan(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Param('planId') planId: string,
  ): Promise<MaintenancePlanResult> {
    return this.maintenance.restorePlan(user.id, vehicleId, planId);
  }

  @Post('plans/:planId/complete')
  @UseGuards(CsrfGuard)
  completePlan(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Param('planId') planId: string,
    @Body() input: CompleteMaintenancePlanDto,
  ): Promise<MaintenanceCompletionResult> {
    return this.maintenance.completePlan(user.id, vehicleId, planId, input);
  }
}
