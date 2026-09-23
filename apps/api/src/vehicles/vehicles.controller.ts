import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiCookieAuth, ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser, VehicleDashboardResult, VehicleResult } from '@tranhanh/shared';
import { AccessAuthGuard, CsrfGuard, CurrentUser, TrustedOriginGuard } from '../auth/auth.guards.js';
import { VehicleDashboardQueryDto } from './vehicle-dashboard.dto.js';
import { VehicleDashboardService } from './vehicle-dashboard.service.js';
import { CreateVehicleDto, UpdateVehicleDto, VehicleListQueryDto } from './vehicles.dto.js';
import { VehiclesService } from './vehicles.service.js';
import { PrivateResponseInterceptor } from './private-response.interceptor.js';

@ApiTags('My Garage')
@ApiCookieAuth('tn_access')
@ApiNotFoundResponse({ description: 'The vehicle does not exist for the authenticated owner.' })
@Controller('vehicles')
@UseGuards(TrustedOriginGuard, AccessAuthGuard)
@UseInterceptors(PrivateResponseInterceptor)
export class VehiclesController {
  constructor(
    private readonly vehicles: VehiclesService,
    private readonly dashboard: VehicleDashboardService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Read a private dashboard for one active vehicle owned by the authenticated user.' })
  dashboardView(
    @CurrentUser() user: AuthUser,
    @Query() query: VehicleDashboardQueryDto,
  ): Promise<VehicleDashboardResult> {
    return this.dashboard.get(user.id, query);
  }

  @Get()
  @ApiOperation({ summary: 'List only the authenticated user’s private vehicles.' })
  list(@CurrentUser() user: AuthUser, @Query() query: VehicleListQueryDto): Promise<VehicleResult[]> {
    return this.vehicles.list(user.id, query.status);
  }

  @Post()
  @UseGuards(CsrfGuard)
  create(@CurrentUser() user: AuthUser, @Body() input: CreateVehicleDto): Promise<VehicleResult> {
    return this.vehicles.create(user.id, input);
  }

  @Post(':id/primary')
  @UseGuards(CsrfGuard)
  setPrimary(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<VehicleResult> {
    return this.vehicles.setPrimary(user.id, id);
  }

  @Post(':id/restore')
  @UseGuards(CsrfGuard)
  restore(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<VehicleResult> {
    return this.vehicles.restore(user.id, id);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<VehicleResult> {
    return this.vehicles.get(user.id, id);
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: UpdateVehicleDto,
  ): Promise<VehicleResult> {
    return this.vehicles.update(user.id, id, input);
  }

  @Delete(':id')
  @UseGuards(CsrfGuard)
  archive(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<VehicleResult> {
    return this.vehicles.archive(user.id, id);
  }
}
