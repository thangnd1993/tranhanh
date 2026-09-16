import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { DevelopmentPasswordResetDelivery, PASSWORD_RESET_DELIVERY } from './auth-delivery.service.js';
import { AuthRateLimitGuard } from './auth-rate-limit.guard.js';
import { AuthService } from './auth.service.js';
import { AuthTokenService } from './auth-token.service.js';
import { PasswordService, TokenHashService } from './auth.crypto.js';
import { AccessAuthGuard, CsrfGuard, TrustedOriginGuard } from './auth.guards.js';

@Module({
  controllers: [AuthController],
  exports: [AccessAuthGuard, AuthService],
  providers: [
    AuthService,
    AuthTokenService,
    PasswordService,
    TokenHashService,
    AuthRateLimitGuard,
    AccessAuthGuard,
    CsrfGuard,
    TrustedOriginGuard,
    DevelopmentPasswordResetDelivery,
    { provide: PASSWORD_RESET_DELIVERY, useExisting: DevelopmentPasswordResetDelivery },
  ],
})
export class AuthModule {}
