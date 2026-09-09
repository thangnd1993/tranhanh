import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://tranhanh:tranhanh@localhost:5432/tranhanh?schema=public';

export default defineConfig({
  migrations: {
    path: 'prisma/migrations',
  },
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
});
