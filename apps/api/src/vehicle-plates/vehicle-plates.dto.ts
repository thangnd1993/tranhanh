import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import type {
  VehiclePlateAllocationResult,
  VehiclePlateAllocationStatus,
  VehiclePlateLookupResult,
  VehiclePlateQuery,
  VehiclePlateTargetResult,
  VehiclePlateTargetType,
  VehiclePlateHistoryResult,
} from '@tranhanh/shared';
import { PhoneSourceDto } from '../phone-prefixes/phone-prefixes.dto.js';

export class VehiclePlateQueryDto implements VehiclePlateQuery {
  @ApiPropertyOptional({
    type: String,
    example: 'Hồ Chí Minh',
    description: 'Numeric prefix, series, or accent-insensitive allocation-target name.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/^(?:[0-9A-Za-z]{1,4}|[\p{L}\p{M} .-]+)$/u)
  q?: string;
  @ApiPropertyOptional({ type: String, example: '5', description: 'One- or two-digit starts-with filter.' })
  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d?$/)
  prefix?: string;
  @ApiPropertyOptional({ type: String, example: 'ho-chi-minh' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  target?: string;
  @ApiPropertyOptional({ enum: ['LOCALITY', 'CENTRAL_AUTHORITY'] })
  @IsOptional()
  @IsIn(['LOCALITY', 'CENTRAL_AUTHORITY'])
  targetType?: VehiclePlateTargetType;
  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: VehiclePlateAllocationStatus;
  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1, maximum: 10000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;
  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}
export class VehiclePlateLookupQueryDto {
  @ApiProperty({
    type: String,
    example: '51K-123.45',
    maxLength: 24,
    description:
      'Two-digit allocation prefix, optional public series, or a common full-plate format. The serial is discarded before lookup.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(24)
  value!: string;
}
export class VehiclePlateTargetDto implements VehiclePlateTargetResult {
  @ApiProperty({ type: String, example: 'ho-chi-minh' }) key!: string;
  @ApiProperty({ type: String, example: 'TP. Hồ Chí Minh' }) name!: string;
  @ApiProperty({ type: [String] }) aliases!: string[];
  @ApiProperty({ enum: ['LOCALITY', 'CENTRAL_AUTHORITY'] }) type!: VehiclePlateTargetType;
  @ApiProperty({ enum: ['VEHICLE_PLATE_ALLOCATION'] }) nameContext!: 'VEHICLE_PLATE_ALLOCATION';
  @ApiProperty({ type: () => PhoneSourceDto }) source!: PhoneSourceDto;
}
export class VehiclePlateHistoryDto implements VehiclePlateHistoryResult {
  @ApiProperty({ type: () => VehiclePlateTargetDto }) previousTarget!: VehiclePlateTargetDto;
  @ApiProperty({ type: String, nullable: true, format: 'date' }) effectiveFrom!: string | null;
  @ApiProperty({
    type: String,
    format: 'date',
    description: 'End of the previous allocation, not invalidation of issued plates.',
  })
  effectiveTo!: string;
  @ApiProperty({ type: () => PhoneSourceDto }) source!: PhoneSourceDto;
  @ApiProperty({ type: () => PhoneSourceDto }) transitionSource!: PhoneSourceDto;
}
export class VehiclePlateAllocationDto implements VehiclePlateAllocationResult {
  @ApiProperty({ type: String, example: '51-current' }) key!: string;
  @ApiProperty({ type: String, example: '51' }) numericPrefix!: string;
  @ApiProperty({ type: String, nullable: true, example: null }) seriesPrefix!: string | null;
  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] }) status!: VehiclePlateAllocationStatus;
  @ApiProperty({ type: () => VehiclePlateTargetDto }) target!: VehiclePlateTargetDto;
  @ApiProperty({ type: String, nullable: true, format: 'date' }) effectiveFrom!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date' }) effectiveTo!: string | null;
  @ApiProperty({ type: () => [VehiclePlateHistoryDto] }) previousTargets!: VehiclePlateHistoryDto[];
  @ApiProperty({ type: () => PhoneSourceDto }) source!: PhoneSourceDto;
  @ApiProperty({ type: String }) importedAt!: string;
  @ApiProperty({ type: String }) updatedAt!: string;
}
export class ParsedVehiclePlateDto {
  @ApiProperty({ type: String, example: '51' }) numericPrefix!: string;
  @ApiProperty({ type: String, nullable: true, example: 'K' }) series!: string | null;
  @ApiProperty({ type: Boolean, description: 'False for the current numeric-only allocation dataset.' })
  seriesAllocationVerified!: boolean;
}
export class VehiclePlateLookupResultDto implements VehiclePlateLookupResult {
  @ApiProperty({ type: () => ParsedVehiclePlateDto }) parsed!: ParsedVehiclePlateDto;
  @ApiProperty({ enum: ['NUMERIC_PREFIX_ALLOCATION'] }) resolution!: 'NUMERIC_PREFIX_ALLOCATION';
  @ApiProperty({ type: () => [VehiclePlateAllocationDto] }) allocations!: VehiclePlateAllocationDto[];
  @ApiProperty({
    type: Boolean,
    description: 'True when several source-backed allocations match; no arbitrary winner is selected.',
  })
  ambiguous!: boolean;
  @ApiProperty({ type: Boolean, enum: [false] }) vehicleOrOwnerVerified!: false;
}
export class VehiclePlatePageDto {
  @ApiProperty({ type: () => [VehiclePlateAllocationDto] }) items!: VehiclePlateAllocationDto[];
  @ApiProperty({ type: Number }) total!: number;
  @ApiProperty({ type: Number }) page!: number;
  @ApiProperty({ type: Number }) pageSize!: number;
}
