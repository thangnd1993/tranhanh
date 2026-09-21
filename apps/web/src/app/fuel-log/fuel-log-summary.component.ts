import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { FuelLogSummary } from '@tranhanh/shared';
import { LocaleService } from '../i18n/locale.service';
import { fuelLogPath } from '../i18n/routes';
import { FuelLogService } from './fuel-log.service';
@Component({
  selector: 'tn-fuel-log-summary',
  imports: [RouterLink],
  template: `<section class="private-summary stack">
    <div class="cluster">
      <h2>{{ i18n.locale() === 'vi' ? 'Nhật ký nhiên liệu' : 'Fuel log' }}</h2>
      <a [routerLink]="fuelLogPath(i18n.locale(), vehicleId())">{{
        i18n.locale() === 'vi' ? 'Xem nhật ký' : 'View log'
      }}</a>
    </div>
    @if (summary(); as s) {
      @if (s.latestRefueledAt) {
        <p>
          {{ i18n.locale() === 'vi' ? 'Lần đổ gần nhất' : 'Latest refueling' }}:
          <strong>{{ date(s.latestRefueledAt) }}</strong> · {{ money(s.totalCostVnd) }}
        </p>
        @if (s.averageLitersPer100Km) {
          <p>{{ s.averageLitersPer100Km }} L/100 km</p>
        } @else {
          <p class="muted">
            {{
              i18n.locale() === 'vi'
                ? 'Chưa đủ dữ liệu để tính mức tiêu thụ.'
                : 'Not enough data to calculate consumption.'
            }}
          </p>
        }
      } @else {
        <p class="muted">
          {{ i18n.locale() === 'vi' ? 'Chưa có lần đổ nhiên liệu nào.' : 'No refueling entries yet.' }}
        </p>
      }
    }
  </section>`,
  styleUrls: ['../garage/vehicle-documents.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FuelLogSummaryComponent implements OnInit {
  readonly vehicleId = input.required<string>();
  protected readonly i18n = inject(LocaleService);
  protected readonly fuelLogPath = fuelLogPath;
  private readonly service = inject(FuelLogService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly summary = signal<FuelLogSummary | null>(null);
  ngOnInit() {
    if (this.browser)
      void this.service
        .summary(this.vehicleId())
        .then((value) => this.summary.set(value))
        .catch(() => undefined);
  }
  protected date(value: string) {
    return new Intl.DateTimeFormat(this.i18n.locale() === 'vi' ? 'vi-VN' : 'en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date(value));
  }
  protected money(value: string) {
    return new Intl.NumberFormat(this.i18n.locale() === 'vi' ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(BigInt(value));
  }
}
