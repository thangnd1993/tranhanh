import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type {
  CompleteMaintenancePlanInput,
  MaintenanceHistoryInput,
  MaintenancePlanInput,
  MaintenancePlanStatus,
} from '@tranhanh/shared';

const nullableTrim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

abstract class MaintenanceTextDto {
  @ApiProperty({ maxLength: 150 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title!: string;

  @ApiProperty({ maxLength: 100 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  category!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 200 })
  @Transform(nullableTrim)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  workshop?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 1000 })
  @Transform(nullableTrim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class CreateMaintenanceHistoryDto extends MaintenanceTextDto implements MaintenanceHistoryInput {
  @ApiProperty({ example: '2026-09-21' })
  @IsDateString({ strict: true })
  serviceDate!: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 10_000_000, nullable: true })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  odometerKm?: number | null;

  @ApiPropertyOptional({ example: '1250000', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,15})$/)
  totalCostVnd?: string | null;
}

export class UpdateMaintenanceHistoryDto extends PartialType(CreateMaintenanceHistoryDto) {}

export class CreateMaintenancePlanDto implements MaintenancePlanInput {
  @ApiProperty({ maxLength: 150 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title!: string;

  @ApiPropertyOptional({ example: '2026-10-21', nullable: true })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dueDate?: string | null;

  @ApiPropertyOptional({ minimum: 0, maximum: 10_000_000, nullable: true })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  dueOdometerKm?: number | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 1000 })
  @Transform(nullableTrim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class UpdateMaintenancePlanDto extends PartialType(CreateMaintenancePlanDto) {}

export class CompleteMaintenancePlanDto implements CompleteMaintenancePlanInput {
  @ApiProperty({ example: '2026-09-21' })
  @IsDateString({ strict: true })
  serviceDate!: string;

  @ApiProperty({ maxLength: 100 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  category!: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 10_000_000, nullable: true })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  odometerKm?: number | null;

  @ApiPropertyOptional({ example: '1250000', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,15})$/)
  totalCostVnd?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 200 })
  @Transform(nullableTrim)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  workshop?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 1000 })
  @Transform(nullableTrim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class MaintenanceHistoryListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'ARCHIVED', 'ALL'], default: 'ACTIVE' })
  @IsOptional()
  @IsIn(['ACTIVE', 'ARCHIVED', 'ALL'])
  status: 'ACTIVE' | 'ARCHIVED' | 'ALL' = 'ACTIVE';
}

export class MaintenancePlanListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'COMPLETED', 'ARCHIVED', 'ALL'], default: 'ACTIVE' })
  @IsOptional()
  @IsIn(['ACTIVE', 'COMPLETED', 'ARCHIVED', 'ALL'])
  status: MaintenancePlanStatus | 'ALL' = 'ACTIVE';
}
