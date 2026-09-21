import { describe, expect, it } from 'vitest';
import { priceChange } from './fuel-price-money.js';
import { fuelPriceFingerprint, validateFuelDataset } from './reviewed-fuel-price.provider.js';

const publication = {
  schemaVersion: 1,
  retrievedAt: '2026-09-21T00:00:00Z',
  publications: [
    {
      publicationNumber: 'TEST/NOTICE',
      title: 'Official test notice',
      url: 'https://minhbach.moit.gov.vn/test',
      publishedAt: '2026-09-17T07:59:00Z',
      effectiveFrom: '2026-09-17T08:00:00Z',
      prices: [
        { productKey: 'e5-ron-92', officialName: 'E5', price: '25139', unit: 'VND_PER_LITER' },
        { productKey: 'e10-ron-95-iii', officialName: 'E10', price: '25636', unit: 'VND_PER_LITER' },
        { productKey: 'diesel-0-05s', officialName: 'Diesel', price: '29945', unit: 'VND_PER_LITER' },
        { productKey: 'mazut-180cst-3-5s', officialName: 'Mazut', price: '19196', unit: 'VND_PER_KILOGRAM' },
      ],
    },
  ],
};
describe('reviewed fuel-price provider', () => {
  it('normalizes complete official publications with exact integer prices and dates', () => {
    const [row] = validateFuelDataset(publication);
    expect(row?.prices.map((item) => item.price)).toEqual([25139n, 25636n, 29945n, 19196n]);
    expect(row?.effectiveFrom.toISOString()).toBe('2026-09-17T08:00:00.000Z');
  });
  type MutableDataset = {
    publications: { effectiveFrom?: string; prices: { productKey: string; price: string; unit: string }[] }[];
  };
  const mutable = () => structuredClone(publication) as unknown as MutableDataset;
  it('rejects partial publications', () => {
    const copy = mutable();
    copy.publications[0]!.prices.pop();
    expect(() => validateFuelDataset(copy)).toThrow('PARTIAL_PUBLICATION');
  });
  it('rejects unknown products', () => {
    const copy = mutable();
    copy.publications[0]!.prices[0]!.productKey = 'unknown';
    expect(() => validateFuelDataset(copy)).toThrow('UNKNOWN_OR_DUPLICATE_PRODUCT');
  });
  it('rejects invalid prices', () => {
    const copy = mutable();
    copy.publications[0]!.prices[0]!.price = '1.5';
    expect(() => validateFuelDataset(copy)).toThrow('INVALID_PRICE');
  });
  it('rejects unexpected units', () => {
    const copy = mutable();
    copy.publications[0]!.prices[0]!.unit = 'VND_PER_KILOGRAM';
    expect(() => validateFuelDataset(copy)).toThrow('UNEXPECTED_UNIT');
  });
  it('rejects a missing effective date', () => {
    const copy = mutable();
    delete copy.publications[0]!.effectiveFrom;
    expect(() => validateFuelDataset(copy)).toThrow('INVALID_EFFECTIVE_FROM');
  });
  it('creates stable, publication-specific fingerprints', () => {
    const date = new Date('2026-09-17T08:00:00Z');
    expect(fuelPriceFingerprint('A', 'e5-ron-92', date, 1n)).toBe(fuelPriceFingerprint('A', 'e5-ron-92', date, 1n));
    expect(fuelPriceFingerprint('A', 'e5-ron-92', date, 1n)).not.toBe(fuelPriceFingerprint('A', 'e5-ron-92', date, 2n));
  });
});
describe('exact fuel-price money', () => {
  it.each([
    [25139n, 23744n, 1395n, 'INCREASE', '5.88'],
    [23000n, 25000n, -2000n, 'DECREASE', '-8.00'],
    [25000n, 25000n, 0n, 'UNCHANGED', '0.00'],
  ])(
    'calculates exact differences and rounded decimal percentages',
    (current, previous, amount, direction, percentage) => {
      expect(priceChange(current, previous)).toEqual({ amount, direction, percentage });
    },
  );
  it('does not fabricate comparison without a previous positive value', () => {
    expect(priceChange(100n, null)).toEqual({ amount: null, direction: null, percentage: null });
    expect(priceChange(100n, 0n).percentage).toBeNull();
  });
});
