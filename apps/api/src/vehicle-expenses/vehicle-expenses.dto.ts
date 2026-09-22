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
import type { VehicleExpenseCategory, VehicleExpenseInput, VehicleExpenseStatus } from '@tranhanh/shared';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const nullableTrim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);

const categories: VehicleExpenseCategory[] = ['INSURANCE', 'REGISTRATION', 'TOLL', 'PARKING', 'OTHER'];

export class CreateVehicleExpenseDto implements VehicleExpenseInput {
  @ApiProperty({ enum: categories })
  @IsIn(categories)
  category!: VehicleExpenseCategory;

  @ApiProperty({ maxLength: 150 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title!: string;

  @ApiProperty({ example: '2026-09-21' })
  @IsDateString({ strict: true })
  expenseDate!: string;

  @ApiProperty({ example: '1250000', description: 'Non-negative integer VND, encoded as a string.' })
  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,15})$/)
  totalCostVnd!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 1000 })
  @Transform(nullableTrim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class UpdateVehicleExpenseDto extends PartialType(CreateVehicleExpenseDto) {}

export class VehicleExpenseListQueryDto {
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
  status: VehicleExpenseStatus | 'ALL' = 'ACTIVE';

  @ApiPropertyOptional({ example: '2026-09' })
  @IsOptional()
  @Matches(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/)
  month?: string;
}

export class VehicleExpenseSummaryQueryDto {
  @ApiPropertyOptional({ example: '2026-09' })
  @IsOptional()
  @Matches(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/)
  month?: string;
}

export class ManualVehicleExpenseListQueryDto extends VehicleExpenseListQueryDto {}
