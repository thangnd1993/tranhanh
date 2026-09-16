import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { validatePostalCodeDataset } from './dataset.js';
import { importPostalCodeDataset } from './import-dataset.js';
const input: unknown = JSON.parse(readFileSync(new URL('../../data/postal-codes.json', import.meta.url), 'utf8'));
const command = process.argv[2];
if (command === 'validate') {
  const data = validatePostalCodeDataset(input);
  console.log(`Validated ${data.assignments.length} postal-code assignments and ${data.targets.length} targets.`);
} else if (command === 'import') {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required for postal-code import.');
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    console.log(await importPostalCodeDataset(client, input));
  } finally {
    await client.$disconnect();
  }
} else throw new Error('Use validate or import.');
