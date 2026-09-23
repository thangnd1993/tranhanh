import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, Matches } from 'class-validator';

export class VehicleDashboardQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'An active vehicle owned by the authenticated user.' })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({ example: '2026-09', description: 'Vietnam calendar month used by expense and fuel cards.' })
  @IsOptional()
  @Matches(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/)
  month?: string;
}
