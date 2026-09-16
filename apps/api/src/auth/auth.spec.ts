import { ConfigService } from '@nestjs/config';
import { decodeJwt } from 'jose';
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeAuthPrisma } from '../../test/fixtures/auth-prisma.js';
import type { PrismaService } from '../database/prisma.service.js';
import { DevelopmentPasswordResetDelivery } from './auth-delivery.service.js';
import { AuthService } from './auth.service.js';
import { AuthTokenService } from './auth-token.service.js';
import { normalizeEmail, PasswordService, redactAuthValue, TokenHashService } from './auth.crypto.js';

const configValues = {
  AUTH_ACCESS_SECRET: 'unit-test-access-secret-that-is-long-enough-2026',
  AUTH_ACCESS_TTL_SECONDS: 900,
  AUTH_REFRESH_TTL_SECONDS: 86_400,
  AUTH_RESET_TTL_SECONDS: 1800,
  AUTH_TOKEN_PEPPER: 'unit-test-token-pepper-that-is-long-enough-2026',
  NODE_ENV: 'test',
};
describe('authentication foundation', () => {
  let fake: FakeAuthPrisma;
  let service: AuthService;
  let passwords: PasswordService;
  let delivery: DevelopmentPasswordResetDelivery;
  beforeEach(() => {
    fake = new FakeAuthPrisma();
    const config = new ConfigService(configValues);
    passwords = new PasswordService();
    delivery = new DevelopmentPasswordResetDelivery(config);
    service = new AuthService(
      fake as unknown as PrismaService,
      passwords,
      new TokenHashService(config),
      new AuthTokenService(config),
      config,
      delivery,
    );
  });
  it('normalizes identity email and stores only Argon2id password hashes', async () => {
    expect(normalizeEmail('  USER@Example.COM ')).toBe('user@example.com');
    const issued = await service.register({ email: '  USER@Example.COM ', password: 'correct horse battery staple' });
    const user = [...fake.users.values()][0];
    const session = [...fake.sessions.values()][0];
    expect(user.email).toBe('user@example.com');
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(JSON.stringify(issued.response)).not.toContain('passwordHash');
    expect(session.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(session.tokenHash).not.toContain(issued.cookies.refreshToken);
    const claims = decodeJwt(issued.cookies.accessToken);
    expect(claims).toMatchObject({ sub: user.id, sid: session.id, type: 'access' });
    expect(claims).not.toHaveProperty('email');
    await expect(
      service.register({ email: 'user@example.com', password: 'another secure password' }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('uses generic credential failures and rejects disabled accounts', async () => {
    await service.register({ email: 'driver@example.com', password: 'correct horse battery staple' });
    await expect(service.login({ email: 'missing@example.com', password: 'wrong' })).rejects.toMatchObject({
      status: 401,
    });
    await expect(service.login({ email: 'driver@example.com', password: 'wrong' })).rejects.toMatchObject({
      status: 401,
    });
    const user = [...fake.users.values()][0];
    user.status = 'DISABLED';
    await expect(
      service.login({ email: 'driver@example.com', password: 'correct horse battery staple' }),
    ).rejects.toMatchObject({ status: 401 });
  });
  it('rotates refresh sessions, rejects reuse, and revokes the family', async () => {
    const initial = await service.register({ email: 'driver@example.com', password: 'correct horse battery staple' });
    const rotated = await service.refresh(
      initial.cookies.refreshToken,
      initial.cookies.csrfToken,
      initial.cookies.csrfToken,
    );
    expect(rotated.cookies.refreshToken).not.toBe(initial.cookies.refreshToken);
    expect([...fake.sessions.values()].filter((session) => session.revokedAt)).toHaveLength(1);
    await expect(
      service.refresh(initial.cookies.refreshToken, initial.cookies.csrfToken, initial.cookies.csrfToken),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      service.refresh(rotated.cookies.refreshToken, rotated.cookies.csrfToken, rotated.cookies.csrfToken),
    ).rejects.toMatchObject({ status: 401 });
  });
  it('rejects expired and explicitly revoked refresh sessions and revokes logout server-side', async () => {
    const expired = await service.register({ email: 'expired@example.com', password: 'correct horse battery staple' });
    [...fake.sessions.values()][0].expiresAt = new Date(Date.now() - 1);
    await expect(
      service.refresh(expired.cookies.refreshToken, expired.cookies.csrfToken, expired.cookies.csrfToken),
    ).rejects.toMatchObject({ status: 401 });
    const active = await service.register({ email: 'active@example.com', password: 'correct horse battery staple' });
    await service.logout(active.cookies.refreshToken, active.cookies.csrfToken, active.cookies.csrfToken);
    expect(
      [...fake.sessions.values()].find((session) => active.cookies.refreshToken.startsWith(session.id))?.revokedAt,
    ).not.toBeNull();
  });
  it('keeps reset enumeration generic, enforces expiry/one-time use, replaces password and revokes sessions', async () => {
    const issued = await service.register({ email: 'driver@example.com', password: 'correct horse battery staple' });
    const missing = await service.requestPasswordReset('missing@example.com');
    const existing = await service.requestPasswordReset('DRIVER@example.com');
    expect(missing).toEqual(existing);
    const token = delivery.take('driver@example.com')!;
    const resetRow = [...fake.resets.values()][0];
    expect(resetRow.tokenHash).not.toContain(token);
    expect(resetRow.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    await service.resetPassword({ token, password: 'a completely new password' });
    await expect(service.resetPassword({ token, password: 'another new password' })).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      service.login({ email: 'driver@example.com', password: 'correct horse battery staple' }),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      service.login({ email: 'driver@example.com', password: 'a completely new password' }),
    ).resolves.toBeDefined();
    expect(fake.sessions.get(issued.cookies.refreshToken.split('.')[0])?.revokedAt).not.toBeNull();
  });
  it('rejects expired resets and redacts security fields recursively', async () => {
    await service.register({ email: 'driver@example.com', password: 'correct horse battery staple' });
    await service.requestPasswordReset('driver@example.com');
    const token = delivery.take('driver@example.com')!;
    [...fake.resets.values()][0].expiresAt = new Date(Date.now() - 1);
    await expect(service.resetPassword({ token, password: 'a completely new password' })).rejects.toMatchObject({
      status: 400,
    });
    expect(
      redactAuthValue({ password: 'visible', headers: { authorization: 'Bearer token', cookie: 'secret' } }),
    ).toEqual({ password: '[REDACTED]', headers: { authorization: '[REDACTED]', cookie: '[REDACTED]' } });
  });
});
