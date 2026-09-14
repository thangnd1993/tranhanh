import { existsSync, readFileSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { AreaDatasetError, validateAreaDataset } from './dataset.js';
import { importAreaDataset } from './import-dataset.js';

async function main(): Promise<void> {
  const action = process.argv[2];
  if (!['validate', 'import'].includes(action)) {
    throw new Error('Use validate or import.');
  }
  const input: unknown = JSON.parse(readFileSync(new URL('../../data/area-codes.json', import.meta.url), 'utf8'));
  const data = validateAreaDataset(input);
  console.info(
    `Validated ${data.localities.length} service areas, ${data.codes.length} codes, ` +
      `${data.migrations.length} legacy mappings.`,
  );
  if (action === 'validate') {
    return;
  }
  const envPath = fileURLToPath(new URL('../../../../.env', import.meta.url));
  if (existsSync(envPath)) {
    loadEnvFile(envPath);
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('An explicit DATABASE_URL is required for import.');
  }
  const schema = new URL(connectionString).searchParams.get('schema') ?? 'public';
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }, { schema }) });
  try {
    console.info(await importAreaDataset(client, data));
  } finally {
    await client.$disconnect();
  }
}

try {
  await main();
} catch (error) {
  if (error instanceof AreaDatasetError) {
    console.error(error.message);
  }
  console.error(
    'Area-code command failed. Validate the reviewed dataset and database configuration; no raw input logged.',
  );
  process.exitCode = 1;
}
