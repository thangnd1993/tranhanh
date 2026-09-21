import type { FuelPriceProvider } from './fuel-price-provider.js';
import { fuelPriceFingerprint } from './reviewed-fuel-price.provider.js';
import type { PrismaService } from '../database/prisma.service.js';

const SOURCE = {
  key: 'moit-fuel-price-notices',
  name: 'Bộ Công Thương',
  homepageUrl: 'https://moit.gov.vn/',
  dataUrl: 'https://minhbach.moit.gov.vn/',
  isOfficial: true,
  isActive: true,
};
export async function importFuelPrices(prisma: PrismaService, provider: FuelPriceProvider) {
  const info = provider.describe();
  const source = await prisma.dataSource.upsert({ where: { key: SOURCE.key }, update: SOURCE, create: SOURCE });
  const providerRow = await prisma.dataProvider.upsert({
    where: { key: info.key },
    update: { name: info.name, sourceId: source.id, providerType: info.capability, status: 'DISABLED' },
    create: { key: info.key, name: info.name, sourceId: source.id, providerType: info.capability, status: 'DISABLED' },
  });
  const run = await prisma.syncRun.create({
    data: { providerId: providerRow.id, jobType: 'FUEL_PRICE_REVIEWED_IMPORT' },
  });
  try {
    const publications = (await provider.read()).sort((a, b) => a.effectiveFrom.valueOf() - b.effectiveFrom.valueOf());
    const result = await prisma.$transaction(async (tx) => {
      let created = 0;
      let unchanged = 0;
      for (let publicationIndex = 0; publicationIndex < publications.length; publicationIndex += 1) {
        const publication = publications[publicationIndex]!;
        let reference = await tx.sourceReference.findFirst({
          where: { sourceId: source.id, externalUrl: publication.url, effectiveFrom: publication.effectiveFrom },
        });
        reference ??= await tx.sourceReference.create({
          data: {
            sourceId: source.id,
            externalUrl: publication.url,
            title: publication.title,
            publishedAt: publication.publishedAt,
            effectiveFrom: publication.effectiveFrom,
            effectiveTo: publications[publicationIndex + 1]?.effectiveFrom,
            retrievedAt: publication.retrievedAt,
            notes: `Official maximum retail prices; publication ${publication.publicationNumber}.`,
          },
        });
        for (const [displayOrder, item] of publication.prices.entries()) {
          const product = await tx.fuelProduct.upsert({
            where: { key: item.productKey },
            update: {
              officialName: item.officialName,
              unit: item.unit,
              sourceId: source.id,
              displayOrder,
              isActive: true,
            },
            create: {
              key: item.productKey,
              officialName: item.officialName,
              unit: item.unit,
              sourceId: source.id,
              displayOrder,
            },
          });
          const fingerprint = fuelPriceFingerprint(
            publication.publicationNumber,
            item.productKey,
            publication.effectiveFrom,
            item.price,
          );
          const existing = await tx.fuelPriceSnapshot.findUnique({ where: { fingerprint } });
          if (existing) {
            unchanged += 1;
            continue;
          }
          const conflicting = await tx.fuelPriceSnapshot.findUnique({
            where: { productId_effectiveFrom: { productId: product.id, effectiveFrom: publication.effectiveFrom } },
          });
          if (conflicting) throw new Error('CONFLICTING_FUEL_PRICE_PUBLICATION');
          await tx.fuelPriceSnapshot.create({
            data: {
              productId: product.id,
              price: item.price,
              effectiveFrom: publication.effectiveFrom,
              effectiveTo: publications[publicationIndex + 1]?.effectiveFrom,
              publishedAt: publication.publishedAt,
              retrievedAt: publication.retrievedAt,
              publicationNumber: publication.publicationNumber,
              fingerprint,
              sourceId: source.id,
              sourceReferenceId: reference.id,
              providerId: providerRow.id,
            },
          });
          created += 1;
        }
      }
      return { read: publications.reduce((count, row) => count + row.prices.length, 0), created, unchanged };
    });
    const finishedAt = new Date();
    await prisma.$transaction([
      prisma.syncRun.update({
        where: { id: run.id },
        data: {
          status: 'SUCCEEDED',
          finishedAt,
          recordsRead: result.read,
          recordsCreated: result.created,
          recordsUpdated: 0,
          recordsSkipped: result.unchanged,
        },
      }),
      prisma.dataProvider.update({ where: { id: providerRow.id }, data: { lastSuccessfulSyncAt: finishedAt } }),
    ]);
    return result;
  } catch (error) {
    const finishedAt = new Date();
    await prisma.$transaction([
      prisma.syncRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          finishedAt,
          recordsRead: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          recordsSkipped: 0,
          errorCode: error instanceof Error ? error.message.slice(0, 100) : 'IMPORT_FAILED',
          errorMessage: 'Reviewed fuel-price import failed validation.',
        },
      }),
      prisma.dataProvider.update({ where: { id: providerRow.id }, data: { lastFailedSyncAt: finishedAt } }),
    ]);
    throw error;
  }
}
