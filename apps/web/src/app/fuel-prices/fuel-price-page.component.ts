import { ChangeDetectionStrategy, Component, computed, inject, RESPONSE_INIT } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type { FuelPriceCurrent, FuelPriceSnapshot, FuelPriceUnit } from '@tranhanh/shared';
import { BreadcrumbComponent } from '../design-system/breadcrumb.component';
import { CardComponent } from '../design-system/card.component';
import { LocaleService } from '../i18n/locale.service';
import { fuelPriceCopy } from './fuel-price-copy';
import type { FuelPricePageData } from './fuel-price-api.service';

@Component({
  selector: 'tn-fuel-price-page',
  imports: [BreadcrumbComponent, CardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fuel-price-page.component.html',
  styleUrl: './fuel-price-page.component.scss',
})
export class FuelPricePageComponent {
  readonly i18n = inject(LocaleService);
  readonly copy = computed(() => fuelPriceCopy(this.i18n.locale()));
  readonly data = inject(ActivatedRoute).snapshot.data['fuel'] as FuelPricePageData;
  readonly response = inject(RESPONSE_INIT, { optional: true });
  constructor() {
    if ((this.data.unavailable || !this.data.current?.items.length) && this.response) {
      this.response.status = 503;
      const headers = new Headers(this.response.headers);
      headers.set('X-Robots-Tag', 'noindex, follow');
      this.response.headers = headers;
    }
  }
  label(item: FuelPriceSnapshot) {
    return this.copy().products[item.productKey] ?? item.officialName;
  }
  money(value: string | null) {
    return value === null
      ? '—'
      : new Intl.NumberFormat(this.i18n.locale() === 'vi' ? 'vi-VN' : 'en-US').format(BigInt(value));
  }
  signed(value: string | null) {
    if (value === null) return '—';
    const number = BigInt(value);
    return `${number > 0n ? '+' : ''}${this.money(value)}`;
  }
  unit(unit: FuelPriceUnit) {
    return unit === 'VND_PER_LITER' ? this.copy().perLiter : this.copy().perKg;
  }
  date(value: string | null) {
    return value
      ? new Intl.DateTimeFormat(this.i18n.locale() === 'vi' ? 'vi-VN' : 'en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'Asia/Ho_Chi_Minh',
        }).format(new Date(value))
      : '—';
  }
  changeLabel(item: FuelPriceCurrent) {
    return item.changeDirection === 'INCREASE'
      ? this.copy().increase
      : item.changeDirection === 'DECREASE'
        ? this.copy().decrease
        : item.changeDirection === 'UNCHANGED'
          ? this.copy().unchanged
          : '—';
  }
  changeIcon(item: FuelPriceCurrent) {
    return item.changeDirection === 'INCREASE'
      ? '↑'
      : item.changeDirection === 'DECREASE'
        ? '↓'
        : item.changeDirection === 'UNCHANGED'
          ? '→'
          : '•';
  }
  history(): FuelPriceSnapshot[] {
    return this.data.history?.items ?? [];
  }
}
