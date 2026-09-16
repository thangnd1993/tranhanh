import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  ChangePasswordRequest,
  DeleteAccountRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UpdateProfileRequest,
} from '@tranhanh/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);
export class EmailDto {
  @ApiProperty({ type: String, format: 'email', maxLength: 320 })
  @Transform(trim)
  @IsEmail()
  @MaxLength(320)
  email!: string;
}
export class PasswordDto {
  @ApiProperty({ type: String, minLength: 12, maxLength: 128, writeOnly: true })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}
export class RegisterDto extends PasswordDto implements RegisterRequest {
  @ApiProperty({ type: String, format: 'email', maxLength: 320 })
  @Transform(trim)
  @IsEmail()
  @MaxLength(320)
  email!: string;
  @ApiPropertyOptional({ type: String, maxLength: 100 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName?: string;
}
export class LoginDto extends EmailDto implements LoginRequest {
  @ApiProperty({ type: String, minLength: 12, maxLength: 128, writeOnly: true })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
export class ForgotPasswordDto extends EmailDto implements ForgotPasswordRequest {}
export class ResetPasswordDto extends PasswordDto implements ResetPasswordRequest {
  @ApiProperty({ type: String, minLength: 40, maxLength: 200, writeOnly: true })
  @IsString()
  @MinLength(40)
  @MaxLength(200)
  token!: string;
}
export class UpdateProfileDto implements UpdateProfileRequest {
  @ApiProperty({ type: String, nullable: true, maxLength: 100 })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName!: string | null;
}
export class ChangePasswordDto implements ChangePasswordRequest {
  @ApiProperty({ type: String, writeOnly: true })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword!: string;
  @ApiProperty({ type: String, minLength: 12, maxLength: 128, writeOnly: true })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  newPassword!: string;
}
export class DeleteAccountDto implements DeleteAccountRequest {
  @ApiProperty({ type: String, writeOnly: true })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
