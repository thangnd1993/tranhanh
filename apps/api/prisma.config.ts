import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';

const envPath = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(envPath)) {
  loadEnvFile(envPath);
}

const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://tranhanh:tranhanh@localhost:5432/tranhanh?schema=public';

export default defineConfig({
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.ts',
  },
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
});
