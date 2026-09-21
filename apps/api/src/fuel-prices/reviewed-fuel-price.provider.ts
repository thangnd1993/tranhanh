import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { FuelPriceUnit, FuelProductKey } from '@tranhanh/shared';
import type { FuelPriceProvider, FuelPriceProviderInfo, NormalizedFuelPublication } from './fuel-price-provider.js';

const PRODUCTS: Record<FuelProductKey, FuelPriceUnit> = {
  'e5-ron-92': 'VND_PER_LITER',
  'e10-ron-95-iii': 'VND_PER_LITER',
  'diesel-0-05s': 'VND_PER_LITER',
  'mazut-180cst-3-5s': 'VND_PER_KILOGRAM',
};
const keys = Object.keys(PRODUCTS) as FuelProductKey[];
const instant = (value: unknown, field: string): Date => {
  const date = new Date(String(value));
  if (!value || Number.isNaN(date.valueOf())) throw new Error(`INVALID_${field.toUpperCase()}`);
  return date;
};
export function fuelPriceFingerprint(
  publicationNumber: string,
  productKey: string,
  effectiveFrom: Date,
  price: bigint,
) {
  return createHash('sha256')
    .update([publicationNumber, productKey, effectiveFrom.toISOString(), price].join('|'))
    .digest('hex');
}
export function validateFuelDataset(raw: unknown): NormalizedFuelPublication[] {
  if (!raw || typeof raw !== 'object') throw new Error('INVALID_DATASET');
  const root = raw as Record<string, unknown>;
  if (root['schemaVersion'] !== 1 || !Array.isArray(root['publications'])) throw new Error('UNSUPPORTED_DATASET');
  const retrievedAt = instant(root['retrievedAt'], 'retrieved_at');
  return root['publications'].map((value) => {
    if (!value || typeof value !== 'object') throw new Error('INVALID_PUBLICATION');
    const row = value as Record<string, unknown>;
    const publicationNumber = String(row['publicationNumber'] ?? '').trim();
    const title = String(row['title'] ?? '').trim();
    const url = String(row['url'] ?? '').trim();
    const effectiveFrom = instant(row['effectiveFrom'], 'effective_from');
    const publishedAt = row['publishedAt'] ? instant(row['publishedAt'], 'published_at') : null;
    if (!publicationNumber || !title || !url.startsWith('https://minhbach.moit.gov.vn/'))
      throw new Error('INVALID_SOURCE');
    if (!Array.isArray(row['prices']) || row['prices'].length !== keys.length) throw new Error('PARTIAL_PUBLICATION');
    const seen = new Set<string>();
    const prices = row['prices'].map((item) => {
      if (!item || typeof item !== 'object') throw new Error('INVALID_PRICE');
      const priceRow = item as Record<string, unknown>;
      const productKey = String(priceRow['productKey']) as FuelProductKey;
      const officialName = String(priceRow['officialName'] ?? '').trim();
      const unit = String(priceRow['unit']) as FuelPriceUnit;
      const priceText = String(priceRow['price'] ?? '');
      if (!keys.includes(productKey) || seen.has(productKey)) throw new Error('UNKNOWN_OR_DUPLICATE_PRODUCT');
      if (PRODUCTS[productKey] !== unit) throw new Error('UNEXPECTED_UNIT');
      if (!officialName || !/^[1-9]\d*$/.test(priceText)) throw new Error('INVALID_PRICE');
      seen.add(productKey);
      return { productKey, officialName, unit, price: BigInt(priceText) };
    });
    return { publicationNumber, title, url, publishedAt, effectiveFrom, retrievedAt, prices };
  });
}
@Injectable()
export class ReviewedFuelPriceProvider implements FuelPriceProvider {
  describe(): FuelPriceProviderInfo {
    return {
      key: 'moit-reviewed-fuel-publications',
      name: 'Reviewed Ministry of Industry and Trade fuel-price publications',
      sourceKey: 'moit-fuel-price-notices',
      capability: 'MANUAL_ONLY',
      official: true,
      updateCadence: 'Reviewed after each official price-adjustment publication; no real-time claim.',
    };
  }
  async read(): Promise<NormalizedFuelPublication[]> {
    const url = new URL('../../data/fuel-prices.json', import.meta.url);
    return validateFuelDataset(JSON.parse(await readFile(url, 'utf8')));
  }
}
