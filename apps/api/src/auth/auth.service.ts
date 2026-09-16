import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthMessageResponse, AuthSessionResponse, AuthUser } from '@tranhanh/shared';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { PASSWORD_RESET_DELIVERY, type PasswordResetDelivery } from './auth-delivery.service.js';
import { AuthTokenService } from './auth-token.service.js';
import type { AuthCookieBundle } from './auth-http.js';
import { normalizeEmail, PasswordService, TokenHashService } from './auth.crypto.js';
import type {
  ChangePasswordDto,
  DeleteAccountDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from './auth.dto.js';

const invalidCredentials = () => new UnauthorizedException('Invalid email or password.');
const invalidReset = () => new BadRequestException('This reset link is invalid or has expired.');
type UserRow = {
  id: string;
  email: string;
  displayName: string | null;
  status: 'ACTIVE' | 'DISABLED' | 'PENDING_DELETION';
  createdAt: Date;
};
function safeUser(user: UserRow): AuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}
export interface IssuedAuth {
  response: AuthSessionResponse;
  cookies: AuthCookieBundle;
}
@Injectable()
export class AuthService {
  private readonly refreshTtlMs: number;
  private readonly resetTtlMs: number;
  private lastCleanupAt = 0;
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly hashes: TokenHashService,
    private readonly accessTokens: AuthTokenService,
    private readonly config: ConfigService,
    @Inject(PASSWORD_RESET_DELIVERY) private readonly resetDelivery: PasswordResetDelivery,
  ) {
    this.refreshTtlMs = config.getOrThrow<number>('AUTH_REFRESH_TTL_SECONDS') * 1000;
    this.resetTtlMs = config.getOrThrow<number>('AUTH_RESET_TTL_SECONDS') * 1000;
  }
  async register(input: RegisterDto): Promise<IssuedAuth> {
    const email = normalizeEmail(input.email);
    const passwordHash = await this.passwords.hash(input.password);
    try {
      const user = await this.prisma.user.create({
        data: { email, passwordHash, displayName: input.displayName ?? null },
      });
      return this.issue(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('An account with this email already exists.');
      throw error;
    }
  }
  async login(input: LoginDto): Promise<IssuedAuth> {
    const user = await this.prisma.user.findUnique({ where: { email: normalizeEmail(input.email) } });
    if (!user) {
      await this.passwords.fakeVerify(input.password);
      throw invalidCredentials();
    }
    const valid = await this.passwords.verify(user.passwordHash, input.password);
    if (!valid || user.status !== 'ACTIVE') throw invalidCredentials();
    const lastLoginAt = new Date();
    const updated = await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt } });
    return this.issue(updated);
  }
  async refresh(
    refreshValue: string | undefined,
    csrfCookie: string | undefined,
    csrfHeader: string | undefined,
  ): Promise<IssuedAuth> {
    const parsed = this.parseCapability(refreshValue);
    if (!parsed) throw new UnauthorizedException('Refresh session is invalid or expired.');
    const current = await this.prisma.authSession.findUnique({ where: { id: parsed.id }, include: { user: true } });
    if (!current || !this.hashes.matches(parsed.secret, current.tokenHash)) {
      if (current) await this.revokeFamily(current.familyId);
      throw new UnauthorizedException('Refresh session is invalid or expired.');
    }
    if (current.revokedAt || current.expiresAt <= new Date() || current.user.status !== 'ACTIVE') {
      if (current.revokedAt) await this.revokeFamily(current.familyId);
      throw new UnauthorizedException('Refresh session is invalid or expired.');
    }
    if (
      !csrfCookie ||
      !csrfHeader ||
      csrfCookie !== csrfHeader ||
      !this.hashes.matches(csrfCookie, current.csrfTokenHash)
    )
      throw new UnauthorizedException('Refresh session is invalid or expired.');
    const nextId = randomUUID();
    const nextSecret = this.hashes.random();
    const nextCsrf = this.hashes.random(24);
    const now = new Date();
    const next = await this.prisma.$transaction(async (tx) => {
      await tx.authSession.create({
        data: {
          id: nextId,
          userId: current.userId,
          familyId: current.familyId,
          tokenHash: this.hashes.hash(nextSecret),
          csrfTokenHash: this.hashes.hash(nextCsrf),
          expiresAt: current.expiresAt,
        },
      });
      const result = await tx.authSession.updateMany({
        where: { id: current.id, revokedAt: null },
        data: { revokedAt: now, lastUsedAt: now, replacedBySessionId: nextId },
      });
      if (result.count !== 1) throw new UnauthorizedException('Refresh session is invalid or expired.');
      return tx.authSession.findUniqueOrThrow({ where: { id: nextId }, include: { user: true } });
    });
    return this.bundle(next.user, next.id, `${next.id}.${nextSecret}`, nextCsrf, next.expiresAt);
  }
  async logout(
    refreshValue: string | undefined,
    csrfCookie: string | undefined,
    csrfHeader: string | undefined,
  ): Promise<AuthMessageResponse> {
    const parsed = this.parseCapability(refreshValue);
    if (parsed) {
      const session = await this.prisma.authSession.findUnique({ where: { id: parsed.id } });
      if (
        session &&
        this.hashes.matches(parsed.secret, session.tokenHash) &&
        csrfCookie &&
        csrfHeader === csrfCookie &&
        this.hashes.matches(csrfCookie, session.csrfTokenHash)
      )
        await this.prisma.authSession.updateMany({
          where: { id: session.id, revokedAt: null },
          data: { revokedAt: new Date(), lastUsedAt: new Date() },
        });
    }
    return { message: 'Signed out.' };
  }
  me(user: AuthUser): AuthUser {
    return user;
  }
  async updateProfile(userId: string, input: UpdateProfileDto): Promise<AuthUser> {
    return safeUser(await this.prisma.user.update({ where: { id: userId }, data: { displayName: input.displayName } }));
  }
  async changePassword(userId: string, input: ChangePasswordDto): Promise<AuthMessageResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await this.passwords.verify(user.passwordHash, input.currentPassword))) throw invalidCredentials();
    const passwordHash = await this.passwords.hash(input.newPassword);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash, passwordChangedAt: now } }),
      this.prisma.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    return { message: 'Password changed.' };
  }
  async requestPasswordReset(emailInput: string): Promise<AuthMessageResponse> {
    const email = normalizeEmail(emailInput);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user?.status === 'ACTIVE') {
      const id = randomUUID();
      const secret = this.hashes.random();
      const now = new Date();
      await this.prisma.$transaction([
        this.prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } }),
        this.prisma.passwordResetToken.create({
          data: {
            id,
            userId: user.id,
            tokenHash: this.hashes.hash(secret),
            expiresAt: new Date(now.getTime() + this.resetTtlMs),
          },
        }),
      ]);
      await this.resetDelivery.deliver(email, `${id}.${secret}`);
    }
    return { message: 'If an eligible account exists, reset instructions have been prepared.' };
  }
  async resetPassword(input: ResetPasswordDto): Promise<AuthMessageResponse> {
    const parsed = this.parseCapability(input.token);
    if (!parsed) throw invalidReset();
    const reset = await this.prisma.passwordResetToken.findUnique({
      where: { id: parsed.id },
      include: { user: true },
    });
    const now = new Date();
    if (
      !reset ||
      reset.usedAt ||
      reset.expiresAt <= now ||
      reset.user.status !== 'ACTIVE' ||
      !this.hashes.matches(parsed.secret, reset.tokenHash)
    )
      throw invalidReset();
    const passwordHash = await this.passwords.hash(input.password);
    await this.prisma.$transaction(async (tx) => {
      const used = await tx.passwordResetToken.updateMany({
        where: { id: reset.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (used.count !== 1) throw invalidReset();
      await tx.user.update({ where: { id: reset.userId }, data: { passwordHash, passwordChangedAt: now } });
      await tx.authSession.updateMany({ where: { userId: reset.userId, revokedAt: null }, data: { revokedAt: now } });
    });
    return { message: 'Password reset completed.' };
  }
  async requestDeletion(userId: string, input: DeleteAccountDto): Promise<AuthMessageResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await this.passwords.verify(user.passwordHash, input.password))) throw invalidCredentials();
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { status: 'PENDING_DELETION', deletionRequestedAt: now },
      }),
      this.prisma.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } }),
    ]);
    return { message: 'Account deletion has been requested.' };
  }
  async cleanupExpiredSessions(now = new Date()): Promise<number> {
    const retention = new Date(now.getTime() - 30 * 86_400_000);
    const [sessions, resets] = await this.prisma.$transaction([
      this.prisma.authSession.deleteMany({
        where: { OR: [{ expiresAt: { lt: retention } }, { revokedAt: { lt: retention } }] },
      }),
      this.prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: retention } } }),
    ]);
    return sessions.count + resets.count;
  }
  private async issue(user: UserRow): Promise<IssuedAuth> {
    if (Date.now() - this.lastCleanupAt > 3_600_000) {
      this.lastCleanupAt = Date.now();
      void this.cleanupExpiredSessions().catch(() => undefined);
    }
    const id = randomUUID();
    const secret = this.hashes.random();
    const csrf = this.hashes.random(24);
    const expiresAt = new Date(Date.now() + this.refreshTtlMs);
    await this.prisma.authSession.create({
      data: {
        id,
        userId: user.id,
        familyId: randomUUID(),
        tokenHash: this.hashes.hash(secret),
        csrfTokenHash: this.hashes.hash(csrf),
        expiresAt,
      },
    });
    return this.bundle(user, id, `${id}.${secret}`, csrf, expiresAt);
  }
  private async bundle(
    user: UserRow,
    sessionId: string,
    refreshToken: string,
    csrfToken: string,
    refreshExpiresAt: Date,
  ): Promise<IssuedAuth> {
    const access = await this.accessTokens.sign(user.id, sessionId);
    return {
      response: { user: safeUser(user), accessExpiresAt: access.expiresAt.toISOString() },
      cookies: {
        accessToken: access.token,
        accessExpiresAt: access.expiresAt,
        refreshToken,
        refreshExpiresAt,
        csrfToken,
      },
    };
  }
  private parseCapability(value: string | undefined): { id: string; secret: string } | null {
    const match = value?.match(
      /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([A-Za-z0-9_-]{40,})$/i,
    );
    return match ? { id: match[1], secret: match[2] } : null;
  }
  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.authSession.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}
