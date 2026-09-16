import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import type { PostalCodeLookupResult, PostalCodePage, PostalCodeQuery } from '@tranhanh/shared';
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
export class PostalCodeQueryDto implements PostalCodeQuery {
  @ApiPropertyOptional({ example: 'Đà Nẵng' }) @IsOptional() @Transform(trim) @IsString() @MaxLength(100) q?: string;
  @ApiPropertyOptional({ example: '50206' }) @IsOptional() @Transform(trim) @Matches(/^\d{1,5}$/) code?: string;
  @ApiPropertyOptional({ example: 'province-06' })
  @IsOptional()
  @IsString()
  @Matches(/^province-\d{2}$/)
  province?: string;
  @ApiPropertyOptional({ enum: ['PROVINCE_CITY', 'WARD', 'COMMUNE', 'SPECIAL_ZONE'] })
  @IsOptional()
  @IsIn(['PROVINCE_CITY', 'WARD', 'COMMUNE', 'SPECIAL_ZONE'])
  targetType?: PostalCodeQuery['targetType'];
  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: PostalCodeQuery['status'];
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
export class PostalCodeLookupQueryDto {
  @ApiProperty({
    example: 'Đà Nẵng',
    description: 'A five-digit code or public locality name; full street addresses are unsupported.',
  })
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q!: string;
}
export class PostalCodePageDto implements PostalCodePage {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: 'array', items: { type: 'object' } }) items!: PostalCodePage['items'];
}
export class PostalCodeLookupResultDto implements PostalCodeLookupResult {
  @ApiProperty() query!: string;
  @ApiProperty({ type: 'array', items: { type: 'object' } }) matches!: PostalCodeLookupResult['matches'];
  @ApiProperty() ambiguous!: boolean;
}
