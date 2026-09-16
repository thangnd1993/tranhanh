import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './environment.js';

describe('validateEnvironment', () => {
  it('provides safe local development defaults', () => {
    const environment = validateEnvironment({});

    expect(environment.API_PORT).toBe(3000);
    expect(environment.DATABASE_URL).toContain('postgresql://');
    expect(environment.REDIS_PORT).toBe(6379);
    expect(environment.AUTH_ACCESS_TTL_SECONDS).toBe(900);
    expect(environment.AUTH_COOKIE_SECURE).toBe(false);
  });

  it('rejects unsafe production auth configuration', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'production', WEB_ORIGIN: 'https://example.test' })).toThrow(
      'production authentication secrets/cookies are unsafe',
    );
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        WEB_ORIGIN: 'http://example.test',
        AUTH_COOKIE_SECURE: true,
        AUTH_ACCESS_SECRET: 'a-strong-production-access-key-with-entropy',
        AUTH_TOKEN_PEPPER: 'a-separate-production-pepper-with-entropy',
      }),
    ).toThrow('production WEB_ORIGIN must use HTTPS');
  });

  it('rejects an invalid database URL', () => {
    expect(() => validateEnvironment({ DATABASE_URL: 'mysql://localhost/example' })).toThrow(
      'Environment validation failed',
    );
  });
});
