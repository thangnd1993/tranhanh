import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiCookieAuth, ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import type {
  AuthUser,
  VehicleExpenseLedgerResult,
  VehicleExpenseListResult,
  VehicleExpenseResult,
  VehicleExpenseSummary,
} from '@tranhanh/shared';
import { AccessAuthGuard, CsrfGuard, CurrentUser, TrustedOriginGuard } from '../auth/auth.guards.js';
import { PrivateResponseInterceptor } from '../vehicles/private-response.interceptor.js';
import {
  CreateVehicleExpenseDto,
  ManualVehicleExpenseListQueryDto,
  UpdateVehicleExpenseDto,
  VehicleExpenseListQueryDto,
  VehicleExpenseSummaryQueryDto,
} from './vehicle-expenses.dto.js';
import { VehicleExpenseService } from './vehicle-expenses.service.js';

@ApiTags('Vehicle Expenses')
@ApiCookieAuth('tn_access')
@ApiNotFoundResponse({ description: 'The private vehicle or expense was not found for this owner.' })
@Controller('vehicles/:vehicleId/expenses')
@UseGuards(TrustedOriginGuard, AccessAuthGuard)
@UseInterceptors(PrivateResponseInterceptor)
export class VehicleExpenseController {
  constructor(private readonly expenses: VehicleExpenseService) {}

  @Get('summary')
  summary(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Query() query: VehicleExpenseSummaryQueryDto,
  ): Promise<VehicleExpenseSummary> {
    return this.expenses.summary(user.id, vehicleId, query.month);
  }

  @Get()
  ledger(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Query() query: VehicleExpenseListQueryDto,
  ): Promise<VehicleExpenseLedgerResult> {
    return this.expenses.listLedger(user.id, vehicleId, query);
  }

  @Get('ledger')
  ledgerAlias(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Query() query: VehicleExpenseListQueryDto,
  ): Promise<VehicleExpenseLedgerResult> {
    return this.expenses.listLedger(user.id, vehicleId, query);
  }

  @Get('manual')
  listManual(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Query() query: ManualVehicleExpenseListQueryDto,
  ): Promise<VehicleExpenseListResult> {
    return this.expenses.listManual(user.id, vehicleId, query);
  }

  @Post('manual')
  @UseGuards(CsrfGuard)
  createManual(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Body() input: CreateVehicleExpenseDto,
  ): Promise<VehicleExpenseResult> {
    return this.expenses.createManual(user.id, vehicleId, input);
  }

  @Get('manual/:expenseId')
  getManual(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Param('expenseId') expenseId: string,
  ): Promise<VehicleExpenseResult> {
    return this.expenses.getManual(user.id, vehicleId, expenseId);
  }

  @Patch('manual/:expenseId')
  @UseGuards(CsrfGuard)
  updateManual(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Param('expenseId') expenseId: string,
    @Body() input: UpdateVehicleExpenseDto,
  ): Promise<VehicleExpenseResult> {
    return this.expenses.updateManual(user.id, vehicleId, expenseId, input);
  }

  @Post('manual/:expenseId/archive')
  @UseGuards(CsrfGuard)
  archiveManual(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Param('expenseId') expenseId: string,
  ): Promise<VehicleExpenseResult> {
    return this.expenses.archiveManual(user.id, vehicleId, expenseId);
  }

  @Post('manual/:expenseId/restore')
  @UseGuards(CsrfGuard)
  restoreManual(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Param('expenseId') expenseId: string,
  ): Promise<VehicleExpenseResult> {
    return this.expenses.restoreManual(user.id, vehicleId, expenseId);
  }
}
