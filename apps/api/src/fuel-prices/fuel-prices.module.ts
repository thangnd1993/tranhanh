import { Module } from '@nestjs/common';
import { FuelPricesController } from './fuel-prices.controller.js';
import { FuelPricesService } from './fuel-prices.service.js';
import { ReviewedFuelPriceProvider } from './reviewed-fuel-price.provider.js';
import { FUEL_PRICE_PROVIDER } from './fuel-price-provider.js';
@Module({
  controllers: [FuelPricesController],
  providers: [
    FuelPricesService,
    ReviewedFuelPriceProvider,
    { provide: FUEL_PRICE_PROVIDER, useExisting: ReviewedFuelPriceProvider },
  ],
  exports: [FuelPricesService, FUEL_PRICE_PROVIDER],
})
export class FuelPricesModule {}
