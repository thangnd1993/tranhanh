import { isPlatformServer } from '@angular/common';
import { inject, Injectable, makeStateKey, PLATFORM_ID, REQUEST_CONTEXT, TransferState } from '@angular/core';
import { isVehicleList, isVehiclePage, isVehicleLookup, readVehicle, readVehicleCatalogue } from './vehicle-data';
@Injectable({ providedIn: 'root' })
export class VehicleApi {
  private readonly transfer = inject(TransferState);
  private readonly server = isPlatformServer(inject(PLATFORM_ID));
  private readonly context = inject(REQUEST_CONTEXT, { optional: true }) as { apiOrigin?: string } | null;
  private get base() {
    return this.server ? (this.context?.apiOrigin ?? 'http://127.0.0.1:3000') : '';
  }
  private async cached<T>(key: string, request: () => Promise<T>): Promise<T> {
    const state = makeStateKey<T>(`vehicle:${key}`);
    if (!this.server && this.transfer.hasKey(state)) {
      const value = this.transfer.get(state, undefined as T);
      this.transfer.remove(state);
      return value;
    }
    const value = await request();
    if (this.server) this.transfer.set(state, value);
    return value;
  }
  catalogue() {
    return this.cached('catalogue', () => readVehicleCatalogue(this.base));
  }
  detail(code: string) {
    return this.cached(code, () => readVehicle(this.base, `/${encodeURIComponent(code)}`, isVehicleLookup));
  }
  related(code: string) {
    return this.cached(`${code}:related`, () =>
      readVehicle(this.base, `/${encodeURIComponent(code)}/related`, isVehicleList),
    );
  }
  lookup(value: string) {
    return readVehicle(this.base, `/lookup?value=${encodeURIComponent(value)}`, isVehicleLookup);
  }
  search(query: string) {
    return readVehicle(this.base, `/search?q=${encodeURIComponent(query)}&page=1&pageSize=20`, isVehiclePage);
  }
}
