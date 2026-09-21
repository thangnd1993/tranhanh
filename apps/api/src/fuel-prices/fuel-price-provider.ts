import type { FuelPriceUnit, FuelProductKey } from '@tranhanh/shared';

export type FuelPriceProviderCapability = 'AUTOMATED' | 'LIMITED' | 'MANUAL_ONLY';
export interface NormalizedFuelPrice {
  productKey: FuelProductKey;
  officialName: string;
  price: bigint;
  unit: FuelPriceUnit;
}
export interface NormalizedFuelPublication {
  publicationNumber: string;
  title: string;
  url: string;
  publishedAt: Date | null;
  effectiveFrom: Date;
  retrievedAt: Date;
  prices: NormalizedFuelPrice[];
}
export interface FuelPriceProviderInfo {
  key: string;
  name: string;
  sourceKey: string;
  capability: FuelPriceProviderCapability;
  official: boolean;
  updateCadence: string;
}
export interface FuelPriceProvider {
  describe(): FuelPriceProviderInfo;
  read(): Promise<NormalizedFuelPublication[]>;
}
export const FUEL_PRICE_PROVIDER = Symbol('FUEL_PRICE_PROVIDER');
