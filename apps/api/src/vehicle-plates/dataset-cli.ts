import { existsSync, readFileSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { VehiclePlateDatasetError, validateVehiclePlateDataset } from './dataset.js';
import { importVehiclePlateDataset } from './import-dataset.js';

async function main(): Promise<void> {
  const action = process.argv[2];
  if (!['validate', 'import'].includes(action)) throw new Error('Use validate or import.');
  const input: unknown = JSON.parse(readFileSync(new URL('../../data/vehicle-plates.json', import.meta.url), 'utf8'));
  const data = validateVehiclePlateDataset(input);
  console.info(
    `Validated ${data.targets.length} allocation targets, ${data.allocations.length} current numeric prefixes, and ${data.history.length} historical target mappings.`,
  );
  if (action === 'validate') return;
  const envPath = fileURLToPath(new URL('../../../../.env', import.meta.url));
  if (existsSync(envPath)) loadEnvFile(envPath);
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('An explicit DATABASE_URL is required for import.');
  const dbSchema = new URL(connectionString).searchParams.get('schema') ?? 'public';
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }, { schema: dbSchema }) });
  try {
    console.info(await importVehiclePlateDataset(client, data));
  } finally {
    await client.$disconnect();
  }
}
try {
  await main();
} catch (error) {
  if (error instanceof VehiclePlateDatasetError) console.error(error.message);
  console.error(
    'Vehicle-plate command failed. Validate the reviewed dataset and database configuration; no submitted plate is logged.',
  );
  process.exitCode = 1;
}
