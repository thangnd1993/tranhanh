import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import type {
  PhonePrefixResult,
  PhonePrefixStatus,
  PhonePrefixQuery,
  PhoneSource,
  PhoneMigration,
} from '@tranhanh/shared';

export class PhoneQueryDto implements PhonePrefixQuery {
  @ApiPropertyOptional({ type: String, description: 'Prefix or accent-insensitive operator name.', example: 'viettel' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/^[\p{L}\p{M}\d -]+$/u)
  q?: string;

  @ApiPropertyOptional({ type: String, description: 'Starts-with prefix filter, 1–4 digits.', example: '03' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,4}$/)
  prefix?: string;

  @ApiPropertyOptional({ type: String, description: 'Stable operator key.', example: 'viettel' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  operator?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'LEGACY', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'LEGACY', 'INACTIVE'])
  status?: PhonePrefixStatus;

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

export class PhoneLookupDto {
  @ApiProperty({
    type: String,
    example: '086',
    maxLength: 32,
    description:
      'Domestic prefix or structurally valid mobile number; supports +84/0084/84, spaces and hyphens. ' +
      'URL-encode + as %2B. Subscriber digits are not retained; prefer prefix-only input for privacy.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  value!: string;
}

export class PhoneSourceDto implements PhoneSource {
  @ApiProperty({ type: String }) publisher!: string;
  @ApiProperty({ type: Boolean }) official!: boolean;
  @ApiProperty({ type: String, nullable: true }) publisherUrl!: string | null;
  @ApiProperty({ type: String, nullable: true }) title!: string | null;
  @ApiProperty({ type: String, nullable: true }) url!: string | null;
  @ApiProperty({ type: String, nullable: true, description: 'Source publication instant, when known.' })
  publishedAt!: string | null;
  @ApiProperty({ type: String, description: 'Evidence retrieval instant; not import or publication time.' })
  retrievedAt!: string;
}
export class PhoneMigrationDto implements PhoneMigration {
  @ApiProperty({ type: String, example: '0168' }) oldPrefix!: string;
  @ApiProperty({ type: String, example: '038' }) newPrefix!: string;
  @ApiProperty({ type: String, nullable: true, description: 'Null when a single cutover instant is not established.' })
  effectiveAt!: string | null;
  @ApiProperty({ type: () => PhoneSourceDto }) source!: PhoneSourceDto;
}
export class PhoneOperatorDto {
  @ApiProperty({ type: String, example: 'viettel' }) key!: string;
  @ApiProperty({ type: String, example: 'Viettel' }) name!: string;
  @ApiProperty({ type: String, nullable: true }) website!: string | null;
}
export class PhonePrefixDto implements PhonePrefixResult {
  @ApiProperty({ type: String, example: '086' }) prefix!: string;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Replacement for a legacy prefix; null if inactive/unmapped.',
  })
  currentPrefix!: string | null;
  @ApiProperty({ enum: ['ACTIVE', 'LEGACY', 'INACTIVE'] }) status!: PhonePrefixStatus;
  @ApiProperty({ type: () => PhoneOperatorDto }) operator!: PhoneOperatorDto;
  @ApiProperty({ enum: ['PREFIX_ALLOCATION'], description: 'Does not resolve number portability or serving network.' })
  operatorResolution!: 'PREFIX_ALLOCATION';
  @ApiProperty({ type: Boolean, enum: [false] }) currentSubscriberNetworkVerified!: false;
  @ApiProperty({ type: String, nullable: true }) effectiveFrom!: string | null;
  @ApiProperty({ type: String, nullable: true }) effectiveTo!: string | null;
  @ApiProperty({ type: () => [PhoneMigrationDto] }) previousPrefixes!: PhoneMigrationDto[];
  @ApiProperty({ type: () => PhoneMigrationDto, nullable: true }) replacement!: PhoneMigrationDto | null;
  @ApiProperty({ type: () => PhoneSourceDto }) source!: PhoneSourceDto;
  @ApiProperty({ type: String, description: 'Last import that changed this record.' }) importedAt!: string;
  @ApiProperty({ type: String, description: 'Database row modification instant, not source publication time.' })
  updatedAt!: string;
}
export class PhonePrefixPageDto {
  @ApiProperty({ type: () => [PhonePrefixDto] }) items!: PhonePrefixDto[];
  @ApiProperty({ type: Number }) total!: number;
  @ApiProperty({ type: Number }) page!: number;
  @ApiProperty({ type: Number }) pageSize!: number;
}
