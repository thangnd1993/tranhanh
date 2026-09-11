import { spawnSync } from 'node:child_process';

// Never fall back to DATABASE_URL or the development database. No reset/drop/create-database operation.
const raw = process.env.TEST_DATABASE_URL;
let valid = false;
if (raw) {
  try {
    const url = new URL(raw);
    valid =
      url.protocol === 'postgresql:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
      url.pathname === '/tranhanh_test' &&
      !url.hash &&
      [...url.searchParams].every(([key, value]) => key === 'schema' && value === 'public');
  } catch {
    /* Report only a safe message, never the supplied connection string. */
  }
}
if (!valid || process.env.NODE_ENV === 'production') {
  console.error(
    'Set TEST_DATABASE_URL to an isolated local tranhanh_test database (public schema); production is refused.',
  );
  process.exit(1);
}

for (const args of [
  ['exec', 'prisma', 'migrate', 'deploy'],
  ['exec', 'vitest', 'run', '--config', 'vitest.config.database.ts'],
]) {
  const result = spawnSync('pnpm', args, {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: raw },
  });
  if (result.error || result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
