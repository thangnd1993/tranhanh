import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('isolated database runner guard', () => {
  it.each([
    '',
    'postgresql://test:secret@example.test/tranhanh_test',
    'postgresql://test:secret@localhost/tranhanh',
    'postgresql://test:secret@localhost/tranhanh_test?schema=production',
    'postgresql://test:secret@localhost/tranhanh_test?host=remote',
  ])('refuses unsafe test URL without connecting or leaking it', (url) => {
    const result = spawnSync(process.execPath, ['test/run-database-tests.ts'], {
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'test', TEST_DATABASE_URL: url },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Set TEST_DATABASE_URL');
    expect(result.stderr).not.toContain('secret');
  });

  it('refuses a production environment even with a local test URL', () => {
    const result = spawnSync(process.execPath, ['test/run-database-tests.ts'], {
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        TEST_DATABASE_URL: 'postgresql://test:secret@localhost/tranhanh_test',
      },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('production is refused');
  });
});
