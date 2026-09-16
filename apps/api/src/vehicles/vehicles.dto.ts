import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { VehicleInput, VehicleStatus, VehicleType } from '@tranhanh/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);
const nullableTrim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || null : value;

export class CreateVehicleDto implements VehicleInput {
  @ApiPropertyOptional({ type: String, maxLength: 100 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName?: string;

  @ApiProperty({ type: String, example: '51K-123.45', maxLength: 20 })
  @Transform(trim)
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  licensePlate!: string;

  @ApiProperty({ enum: ['CAR', 'MOTORCYCLE', 'TRUCK', 'VAN', 'OTHER'] })
  @IsIn(['CAR', 'MOTORCYCLE', 'TRUCK', 'VAN', 'OTHER'])
  vehicleType!: VehicleType;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 100 })
  @Transform(nullableTrim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  make?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 100 })
  @Transform(nullableTrim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 1886, maximum: 2100 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1886)
  @Max(2100)
  modelYear?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 0, maximum: 10000000 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  currentOdometerKm?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 1000 })
  @Transform(nullableTrim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {
  @ApiPropertyOptional({ type: Boolean, description: 'Explicitly allows a corrected lower odometer reading.' })
  @IsOptional()
  @IsBoolean()
  allowOdometerCorrection?: boolean;
}

export class VehicleListQueryDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'ARCHIVED', 'ALL'], default: 'ACTIVE' })
  @IsOptional()
  @IsIn(['ACTIVE', 'ARCHIVED', 'ALL'])
  status: VehicleStatus | 'ALL' = 'ACTIVE';
}
