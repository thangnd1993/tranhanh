import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './environment.js';

describe('validateEnvironment', () => {
  it('provides safe local development defaults', () => {
    const environment = validateEnvironment({});

    expect(environment.API_PORT).toBe(3000);
    expect(environment.DATABASE_URL).toContain('postgresql://');
    expect(environment.REDIS_PORT).toBe(6379);
  });

  it('rejects an invalid database URL', () => {
    expect(() => validateEnvironment({ DATABASE_URL: 'mysql://localhost/example' })).toThrow(
      'Environment validation failed',
    );
  });
});
