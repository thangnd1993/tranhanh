import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { FuelLogEntryInput, FuelLogProductKey, FuelLogUnit } from '@tranhanh/shared';

const nullableTrim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);
export class CreateFuelLogEntryDto implements FuelLogEntryInput {
  @ApiProperty({ example: '2026-09-21T08:30:00.000Z' })
  @IsDateString({ strict: true })
  refueledAt!: string;
  @ApiProperty({ minimum: 0, maximum: 10_000_000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  odometerKm!: number;
  @ApiProperty({ example: '32.450' })
  @IsString()
  @Matches(/^(?:0\.(?:00[1-9]|0[1-9]\d|[1-9]\d{0,2})|[1-9]\d{0,6}(?:\.\d{1,3})?)$/)
  quantity!: string;
  @ApiPropertyOptional({ enum: ['LITER'], default: 'LITER' })
  @IsOptional()
  @IsIn(['LITER'])
  unit?: FuelLogUnit;
  @ApiProperty({ example: '850000' })
  @IsString()
  @Matches(/^[1-9]\d{0,15}$/)
  totalCostVnd!: string;
  @ApiPropertyOptional({ enum: ['e5-ron-92', 'e10-ron-95-iii', 'diesel-0-05s', 'OTHER'], nullable: true })
  @IsOptional()
  @IsIn(['e5-ron-92', 'e10-ron-95-iii', 'diesel-0-05s', 'OTHER'])
  fuelProductKey?: FuelLogProductKey | null;
  @ApiPropertyOptional({ maxLength: 100, nullable: true })
  @Transform(nullableTrim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customFuelLabel?: string | null;
  @ApiProperty()
  @IsBoolean()
  isFullTank!: boolean;
  @ApiPropertyOptional({ maxLength: 150, nullable: true })
  @Transform(nullableTrim)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  station?: string | null;
  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @Transform(nullableTrim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
export class UpdateFuelLogEntryDto extends PartialType(CreateFuelLogEntryDto) {}
export class FuelLogListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
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
  @ApiPropertyOptional({ example: '2026-09' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month?: string;
}
export class FuelLogSummaryQueryDto {
  @ApiPropertyOptional({ example: '2026-09' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month?: string;
}
