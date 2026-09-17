import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiCookieAuth, ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser, VehicleDocumentListResult, VehicleDocumentResult } from '@tranhanh/shared';
import { AccessAuthGuard, CsrfGuard, CurrentUser, TrustedOriginGuard } from '../auth/auth.guards.js';
import { PrivateResponseInterceptor } from '../vehicles/private-response.interceptor.js';
import {
  CreateVehicleDocumentDto,
  UpdateVehicleDocumentDto,
  UpdateVehicleDocumentRemindersDto,
  VehicleDocumentListQueryDto,
} from './vehicle-documents.dto.js';
import { VehicleDocumentsService } from './vehicle-documents.service.js';
@ApiTags('Vehicle Documents')
@ApiCookieAuth('tn_access')
@ApiNotFoundResponse({ description: 'The private vehicle document was not found for this owner.' })
@Controller('vehicles/:vehicleId/documents')
@UseGuards(TrustedOriginGuard, AccessAuthGuard)
@UseInterceptors(PrivateResponseInterceptor)
export class VehicleDocumentsController {
  constructor(private readonly documents: VehicleDocumentsService) {}
  @Get() list(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Query() query: VehicleDocumentListQueryDto,
  ): Promise<VehicleDocumentListResult> {
    return this.documents.list(user.id, vehicleId, query.status);
  }
  @Post() @UseGuards(CsrfGuard) create(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Body() input: CreateVehicleDocumentDto,
  ): Promise<VehicleDocumentResult> {
    return this.documents.create(user.id, vehicleId, input);
  }
  @Get(':documentId') get(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Param('documentId') documentId: string,
  ): Promise<VehicleDocumentResult> {
    return this.documents.get(user.id, vehicleId, documentId);
  }
  @Patch(':documentId') @UseGuards(CsrfGuard) update(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Param('documentId') documentId: string,
    @Body() input: UpdateVehicleDocumentDto,
  ): Promise<VehicleDocumentResult> {
    return this.documents.update(user.id, vehicleId, documentId, input);
  }
  @Delete(':documentId') @UseGuards(CsrfGuard) archive(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Param('documentId') documentId: string,
  ): Promise<VehicleDocumentResult> {
    return this.documents.archive(user.id, vehicleId, documentId);
  }
  @Post(':documentId/restore') @UseGuards(CsrfGuard) restore(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Param('documentId') documentId: string,
  ): Promise<VehicleDocumentResult> {
    return this.documents.restore(user.id, vehicleId, documentId);
  }
  @Put(':documentId/reminders') @UseGuards(CsrfGuard) reminders(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Param('documentId') documentId: string,
    @Body() input: UpdateVehicleDocumentRemindersDto,
  ): Promise<VehicleDocumentResult> {
    return this.documents.reminders(user.id, vehicleId, documentId, input.enabledDaysBefore);
  }
}
