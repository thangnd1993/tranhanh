import type { IntegerString, PageResult } from './pagination.js';

export type FuelProductKey = 'e5-ron-92' | 'e10-ron-95-iii' | 'diesel-0-05s' | 'mazut-180cst-3-5s';
export type FuelPriceUnit = 'VND_PER_LITER' | 'VND_PER_KILOGRAM';
export type FuelPriceDirection = 'INCREASE' | 'DECREASE' | 'UNCHANGED';
export type FuelPriceSemantics = 'MAXIMUM_RETAIL_PRICE';

export interface FuelPriceSourceInfo {
  publisher: string;
  official: boolean;
  title: string;
  url: string;
  publicationNumber: string;
}

export interface FuelPriceSnapshot {
  id: string;
  productKey: FuelProductKey;
  officialName: string;
  price: IntegerString;
  unit: FuelPriceUnit;
  semantics: FuelPriceSemantics;
  effectiveFrom: string;
  publishedAt: string | null;
  retrievedAt: string;
  source: FuelPriceSourceInfo;
}

export interface FuelPriceCurrent extends FuelPriceSnapshot {
  previousPrice: IntegerString | null;
  changeAmount: IntegerString | null;
  changeDirection: FuelPriceDirection | null;
  changePercentage: string | null;
}

export interface FuelPricesCurrentResponse {
  items: FuelPriceCurrent[];
  retrievedAt: string | null;
  stale: boolean;
  degraded: boolean;
  staleAfter: string | null;
}

export interface FuelPriceHistoryQuery {
  product?: FuelProductKey;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export type FuelPriceHistoryResponse = PageResult<FuelPriceSnapshot>;
