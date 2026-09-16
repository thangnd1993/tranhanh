import { Body, Controller, Delete, Get, Headers, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthMessageResponse, AuthSessionResponse, AuthUser } from '@tranhanh/shared';
import type { Request, Response } from 'express';
import { AuthRateLimit, AuthRateLimitGuard } from './auth-rate-limit.guard.js';
import { AuthService } from './auth.service.js';
import { clearAuthCookies, CSRF_COOKIE, readCookies, REFRESH_COOKIE, setAuthCookies } from './auth-http.js';
import { AccessAuthGuard, CsrfGuard, CurrentUser, TrustedOriginGuard } from './auth.guards.js';
import {
  ChangePasswordDto,
  DeleteAccountDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from './auth.dto.js';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(TrustedOriginGuard, AuthRateLimitGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}
  @Post('register')
  @AuthRateLimit(10, 10 * 60_000)
  @ApiOperation({ summary: 'Create an optional account and a revocable browser session.' })
  @ApiOkResponse({ description: 'Safe user/session summary; credentials are set in HttpOnly cookies.' })
  @ApiConflictResponse({ description: 'The normalized email is already registered.' })
  async register(
    @Body() input: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponse> {
    const issued = await this.auth.register(input);
    setAuthCookies(response, this.config, issued.cookies);
    return issued.response;
  }
  @Post('login')
  @AuthRateLimit(10, 10 * 60_000)
  @ApiOperation({ summary: 'Authenticate with enumeration-resistant errors.' })
  async login(@Body() input: LoginDto, @Res({ passthrough: true }) response: Response): Promise<AuthSessionResponse> {
    const issued = await this.auth.login(input);
    setAuthCookies(response, this.config, issued.cookies);
    return issued.response;
  }
  @Post('refresh')
  @AuthRateLimit(60, 10 * 60_000)
  @ApiOperation({ summary: 'Rotate the current refresh session and both browser tokens.' })
  async refresh(
    @Req() request: Request,
    @Headers('x-csrf-token') csrfHeader: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponse> {
    const cookies = readCookies(request);
    const issued = await this.auth.refresh(cookies[REFRESH_COOKIE], cookies[CSRF_COOKIE], csrfHeader);
    setAuthCookies(response, this.config, issued.cookies);
    return issued.response;
  }
  @Post('logout')
  @AuthRateLimit(60, 10 * 60_000)
  @ApiOperation({ summary: 'Revoke the server-side session and remove browser cookies.' })
  async logout(
    @Req() request: Request,
    @Headers('x-csrf-token') csrfHeader: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthMessageResponse> {
    const cookies = readCookies(request);
    const result = await this.auth.logout(cookies[REFRESH_COOKIE], cookies[CSRF_COOKIE], csrfHeader);
    clearAuthCookies(response, this.config);
    return result;
  }
  @Post('forgot-password')
  @AuthRateLimit(5, 15 * 60_000)
  @ApiOperation({ summary: 'Prepare reset delivery without revealing whether an account exists.' })
  forgotPassword(@Body() input: ForgotPasswordDto): Promise<AuthMessageResponse> {
    return this.auth.requestPasswordReset(input.email);
  }
  @Post('reset-password')
  @AuthRateLimit(10, 15 * 60_000)
  @ApiOperation({ summary: 'Consume a one-time reset token and revoke existing sessions.' })
  resetPassword(@Body() input: ResetPasswordDto): Promise<AuthMessageResponse> {
    return this.auth.resetPassword(input);
  }
  @Get('me')
  @UseGuards(AccessAuthGuard)
  @ApiCookieAuth('tn_access')
  @ApiUnauthorizedResponse({ description: 'Authentication is missing, expired, or revoked.' })
  me(@CurrentUser() user: AuthUser): AuthUser {
    return this.auth.me(user);
  }
  @Patch('me')
  @UseGuards(AccessAuthGuard, CsrfGuard)
  @ApiCookieAuth('tn_access')
  updateProfile(@CurrentUser() user: AuthUser, @Body() input: UpdateProfileDto): Promise<AuthUser> {
    return this.auth.updateProfile(user.id, input);
  }
  @Post('change-password')
  @UseGuards(AccessAuthGuard, CsrfGuard)
  @AuthRateLimit(10, 15 * 60_000)
  @ApiCookieAuth('tn_access')
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() input: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthMessageResponse> {
    const result = await this.auth.changePassword(user.id, input);
    clearAuthCookies(response, this.config);
    return result;
  }
  @Delete('account')
  @UseGuards(AccessAuthGuard, CsrfGuard)
  @AuthRateLimit(3, 60 * 60_000)
  @ApiCookieAuth('tn_access')
  async deleteAccount(
    @CurrentUser() user: AuthUser,
    @Body() input: DeleteAccountDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthMessageResponse> {
    const result = await this.auth.requestDeletion(user.id, input);
    clearAuthCookies(response, this.config);
    return result;
  }
}
