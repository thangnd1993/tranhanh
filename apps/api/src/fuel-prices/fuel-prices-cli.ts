import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service.js';
import { importFuelPrices } from './import-fuel-prices.js';
import { ReviewedFuelPriceProvider } from './reviewed-fuel-price.provider.js';
const prisma = new PrismaService(new ConfigService({ DATABASE_URL: process.env['DATABASE_URL'] }));
try {
  await prisma.$connect();
  const result = await importFuelPrices(prisma, new ReviewedFuelPriceProvider());
  console.log(JSON.stringify(result));
} finally {
  await prisma.$disconnect();
}
