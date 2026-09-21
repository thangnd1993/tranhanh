import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { FuelProductKey } from '@tranhanh/shared';

const products: FuelProductKey[] = ['e5-ron-92', 'e10-ron-95-iii', 'diesel-0-05s', 'mazut-180cst-3-5s'];
export class FuelPriceHistoryQueryDto {
  @ApiPropertyOptional({ enum: products })
  @IsOptional()
  @IsIn(products)
  product?: FuelProductKey;

  @ApiPropertyOptional({ example: '2026-09-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString({ strict: true })
  from?: string;

  @ApiPropertyOptional({ example: '2026-09-30T23:59:59.999Z' })
  @IsOptional()
  @IsDateString({ strict: true })
  to?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
export class FuelPriceCurrentResponseDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } }) items!: unknown[];
  @ApiPropertyOptional() retrievedAt!: string | null;
  @ApiProperty() stale!: boolean;
  @ApiProperty() degraded!: boolean;
  @ApiPropertyOptional() staleAfter!: string | null;
}
export class FuelPriceHistoryResponseDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } }) items!: unknown[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}
