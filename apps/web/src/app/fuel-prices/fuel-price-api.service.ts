import { inject, Injectable, makeStateKey, REQUEST_CONTEXT, TransferState } from '@angular/core';
import type { FuelPriceHistoryResponse, FuelPricesCurrentResponse } from '@tranhanh/shared';

export interface FuelPricePageData {
  current: FuelPricesCurrentResponse | null;
  history: FuelPriceHistoryResponse | null;
  unavailable: boolean;
}
const stateKey = makeStateKey<FuelPricePageData>('fuel-price-page');
@Injectable({ providedIn: 'root' })
export class FuelPriceApi {
  private readonly transfer = inject(TransferState);
  private readonly context = inject(REQUEST_CONTEXT, { optional: true }) as { apiOrigin?: string } | null;
  async pageData(): Promise<FuelPricePageData> {
    if (this.transfer.hasKey(stateKey)) {
      const value = this.transfer.get(stateKey, { current: null, history: null, unavailable: true });
      this.transfer.remove(stateKey);
      return value;
    }
    const base = this.context?.apiOrigin ?? '';
    try {
      const [currentResponse, historyResponse] = await Promise.all([
        fetch(base + '/api/v1/fuel-prices/current', {
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(5000),
        }),
        fetch(base + '/api/v1/fuel-prices/history?pageSize=40', {
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(5000),
        }),
      ]);
      if (!currentResponse.ok || !historyResponse.ok) throw new Error('Fuel price API unavailable');
      const current = (await currentResponse.json()) as FuelPricesCurrentResponse;
      const history = (await historyResponse.json()) as FuelPriceHistoryResponse;
      if (!Array.isArray(current.items) || !Array.isArray(history.items))
        throw new Error('Invalid fuel price response');
      const value = { current, history, unavailable: false };
      if (this.context) this.transfer.set(stateKey, value);
      return value;
    } catch {
      const value = { current: null, history: null, unavailable: true };
      if (this.context) this.transfer.set(stateKey, value);
      return value;
    }
  }
}
