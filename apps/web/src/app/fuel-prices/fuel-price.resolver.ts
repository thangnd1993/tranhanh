import { inject } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import { FuelPriceApi, type FuelPricePageData } from './fuel-price-api.service';
export const fuelPriceResolver: ResolveFn<FuelPricePageData> = () => inject(FuelPriceApi).pageData();
