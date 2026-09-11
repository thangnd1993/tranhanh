import { isPlatformServer } from '@angular/common';
import { inject, Injectable, makeStateKey, PLATFORM_ID, REQUEST_CONTEXT, TransferState } from '@angular/core';
import { isPhoneList, isPhoneResult, readCatalogue, readPhone } from './phone-data';
@Injectable({ providedIn: 'root' })
export class PhoneApi {
  private readonly transfer = inject(TransferState);
  private readonly server = isPlatformServer(inject(PLATFORM_ID));
  private readonly context = inject(REQUEST_CONTEXT, { optional: true }) as { apiOrigin?: string } | null;
  private get base() {
    return this.server ? (this.context?.apiOrigin ?? 'http://127.0.0.1:3000') : '';
  }
  private async cached<T>(key: string, request: () => Promise<T>): Promise<T> {
    const state = makeStateKey<T>(`phone:${key}`);
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
    return this.cached('catalogue', () => readCatalogue(this.base));
  }
  detail(prefix: string) {
    return this.cached(prefix, () => readPhone(this.base, `/${encodeURIComponent(prefix)}`, isPhoneResult));
  }
  related(prefix: string) {
    return this.cached(`${prefix}:related`, () => readPhone(this.base, `/${prefix}/related`, isPhoneList));
  }
  // Never transfer, cache, persist or echo a submitted subscriber number.
  lookup(value: string) {
    return readPhone(this.base, `/lookup?value=${encodeURIComponent(value)}`, isPhoneResult);
  }
}
