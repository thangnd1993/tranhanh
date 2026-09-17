import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayUnique, IsArray, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import type {
  VehicleDocumentInput,
  VehicleDocumentReminderOffset,
  VehicleDocumentStatus,
  VehicleDocumentType,
} from '@tranhanh/shared';
const types = [
  'VEHICLE_REGISTRATION',
  'PERIODIC_INSPECTION',
  'COMPULSORY_CIVIL_LIABILITY_INSURANCE',
  'VOLUNTARY_VEHICLE_INSURANCE',
  'ROAD_USE_FEE',
  'OTHER',
] as const;
const offsets = [1, 7, 15, 30] as const;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const nullableTrim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);
export class CreateVehicleDocumentDto implements VehicleDocumentInput {
  @ApiProperty({ enum: types }) @IsIn(types) type!: VehicleDocumentType;
  @ApiProperty({ maxLength: 150 }) @Transform(trim) @IsString() @MinLength(1) @MaxLength(150) displayName!: string;
  @ApiPropertyOptional({ nullable: true, maxLength: 150 })
  @Transform(nullableTrim)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  referenceNumber?: string | null;
  @ApiPropertyOptional({ nullable: true, maxLength: 200 })
  @Transform(nullableTrim)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  issuer?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) issuedAt?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) effectiveFrom?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) expiresAt?: string | null;
  @ApiPropertyOptional({ nullable: true, maxLength: 1000 })
  @Transform(nullableTrim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
  @ApiPropertyOptional({ isArray: true, enum: offsets })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(offsets, { each: true })
  reminderDaysBefore?: VehicleDocumentReminderOffset[];
}
export class UpdateVehicleDocumentDto extends PartialType(CreateVehicleDocumentDto) {}
export class UpdateVehicleDocumentRemindersDto {
  @ApiProperty({ isArray: true, enum: offsets })
  @IsArray()
  @ArrayUnique()
  @IsIn(offsets, { each: true })
  enabledDaysBefore!: VehicleDocumentReminderOffset[];
}
export class VehicleDocumentListQueryDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'ARCHIVED', 'ALL'], default: 'ACTIVE' })
  @IsOptional()
  @IsIn(['ACTIVE', 'ARCHIVED', 'ALL'])
  status: VehicleDocumentStatus | 'ALL' = 'ACTIVE';
}
