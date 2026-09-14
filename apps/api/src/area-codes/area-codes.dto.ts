import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import type {
  AreaCodeResult,
  AreaCodeStatus,
  AreaCodeQuery,
  AreaCodeMigrationResult,
  AreaCodeLocality,
} from '@tranhanh/shared';
import { PhoneSourceDto } from '../phone-prefixes/phone-prefixes.dto.js';
export class AreaQueryDto implements AreaCodeQuery {
  @ApiPropertyOptional({
    type: String,
    example: 'Đà Nẵng',
    description: 'Code or accent-insensitive service area/group name; includes reviewed aliases such as TP.HCM.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/^(?:\d{1,4}|[\p{L}\p{M} .-]+)$/u)
  q?: string;
  @ApiPropertyOptional({ type: String, example: '023', description: 'Domestic code starts-with filter, 1–4 digits.' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,4}$/)
  code?: string;
  @ApiPropertyOptional({
    type: String,
    example: 'da-nang',
    description: 'Stable telecom service-area key, not an administrative identifier.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  locality?: string;
  @ApiPropertyOptional({ type: String, example: 'da-nang-2025', description: 'Reviewed telecom grouping key.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  group?: string;
  @ApiPropertyOptional({ enum: ['ACTIVE', 'LEGACY', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'LEGACY', 'INACTIVE'])
  status?: AreaCodeStatus;
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
export class AreaLookupDto {
  @ApiProperty({
    type: String,
    example: '+84236',
    maxLength: 32,
    description:
      'Code with/without trunk 0, +84/0084/84, spaces or hyphens. Trailing hyphen allowed for codes only. ' +
      'Current full fixed-line numbers: 11 domestic digits including 0; match known active codes only. ' +
      'No subscriber identification. Full legacy/mobile numbers are unsupported. URL-encode + as %2B.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  value!: string;
}
export class AreaMigrationDto implements AreaCodeMigrationResult {
  @ApiProperty({ type: String, example: '0511' }) oldCode!: string;
  @ApiProperty({ type: String, example: '0236' }) newCode!: string;
  @ApiProperty({
    type: String,
    nullable: true,
    format: 'date',
    description: 'Transition start date, not end of parallel dialing.',
  })
  effectiveDate!: string | null;
  @ApiProperty({ type: () => PhoneSourceDto }) source!: PhoneSourceDto;
}
export class TelecomGroupDto {
  @ApiProperty({ type: String, example: 'da-nang-2025' }) key!: string;
  @ApiProperty({ type: String, example: 'Đà Nẵng' }) name!: string;
  @ApiProperty({ type: String, nullable: true, format: 'date' }) effectiveFrom!: string | null;
  @ApiProperty({ type: () => PhoneSourceDto }) source!: PhoneSourceDto;
}
export class TelecomLocalityDto implements AreaCodeLocality {
  @ApiProperty({ type: String, example: 'da-nang' }) key!: string;
  @ApiProperty({
    type: String,
    example: 'Đà Nẵng',
    description: 'Source-era coverage name; not necessarily the current administrative province.',
  })
  name!: string;
  @ApiProperty({ type: [String] }) aliases!: string[];
  @ApiProperty({ enum: ['TELECOM_SERVICE_AREA'] }) nameContext!: 'TELECOM_SERVICE_AREA';
  @ApiProperty({ type: () => PhoneSourceDto }) source!: PhoneSourceDto;
  @ApiProperty({ type: () => TelecomGroupDto }) group!: TelecomGroupDto;
}
export class AreaCodeDto implements AreaCodeResult {
  @ApiProperty({ type: String, example: '0236' }) code!: string;
  @ApiProperty({ type: String, nullable: true, description: 'Replacement for historical input; same code if active.' })
  currentCode!: string | null;
  @ApiProperty({ enum: ['ACTIVE', 'LEGACY', 'INACTIVE'] }) status!: AreaCodeStatus;
  @ApiProperty({ type: () => TelecomLocalityDto }) locality!: TelecomLocalityDto;
  @ApiProperty({ enum: ['GEOGRAPHIC_AREA_CODE'] }) resolution!: 'GEOGRAPHIC_AREA_CODE';
  @ApiProperty({ type: Boolean, enum: [false] }) subscriberVerified!: false;
  @ApiProperty({ type: String, nullable: true, format: 'date' }) effectiveFrom!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date' }) effectiveTo!: string | null;
  @ApiProperty({ type: () => [AreaMigrationDto] }) previousCodes!: AreaMigrationDto[];
  @ApiProperty({ type: () => AreaMigrationDto, nullable: true }) replacement!: AreaMigrationDto | null;
  @ApiProperty({ type: () => PhoneSourceDto }) source!: PhoneSourceDto;
  @ApiProperty({ type: String, description: 'Last import changing this record.' }) importedAt!: string;
  @ApiProperty({ type: String, description: 'Database update instant, not source publication.' }) updatedAt!: string;
}
export class AreaCodePageDto {
  @ApiProperty({ type: () => [AreaCodeDto] }) items!: AreaCodeDto[];
  @ApiProperty({ type: Number }) total!: number;
  @ApiProperty({ type: Number }) page!: number;
  @ApiProperty({ type: Number }) pageSize!: number;
}
