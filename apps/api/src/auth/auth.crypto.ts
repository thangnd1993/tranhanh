import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { argon2id, hash, verify } from 'argon2';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export function normalizeEmail(value: string): string {
  return value.trim().normalize('NFKC').toLowerCase();
}
@Injectable()
export class PasswordService {
  private readonly dummyHash = this.hash('not-a-real-password-credential');
  hash(password: string): Promise<string> {
    return hash(password, { type: argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
  }
  verify(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password).catch(() => false);
  }
  async fakeVerify(password: string): Promise<void> {
    await this.verify(await this.dummyHash, password);
  }
}
@Injectable()
export class TokenHashService {
  private readonly pepper: string;
  constructor(config: ConfigService) {
    this.pepper = config.getOrThrow<string>('AUTH_TOKEN_PEPPER');
  }
  random(bytes = 32): string {
    return randomBytes(bytes).toString('base64url');
  }
  hash(value: string): string {
    return createHmac('sha256', this.pepper).update(value).digest('hex');
  }
  matches(value: string, expected: string): boolean {
    const actual = Buffer.from(this.hash(value), 'hex');
    const target = Buffer.from(expected, 'hex');
    return actual.length === target.length && timingSafeEqual(actual, target);
  }
}
export const sensitiveAuthFields = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'passwordHash',
  'accessToken',
  'refreshToken',
  'resetToken',
  'token',
  'authorization',
  'cookie',
  'set-cookie',
]);
export function redactAuthValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactAuthValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      sensitiveAuthFields.has(key) || sensitiveAuthFields.has(key.toLowerCase())
        ? '[REDACTED]'
        : redactAuthValue(entry),
    ]),
  );
}
