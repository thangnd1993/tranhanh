import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { FuelLogEntryResult } from '@tranhanh/shared';
import { ButtonDirective } from '../design-system/button.directive';
import { LocaleService } from '../i18n/locale.service';
import { fuelLogPath } from '../i18n/routes';
import { FuelLogService } from './fuel-log.service';
@Component({
  selector: 'tn-fuel-log-entry-page',
  imports: [RouterLink, ButtonDirective],
  template: `<section class="container section stack fuel-form-page">
    <a
      class="back-link"
      [routerLink]="fuelLogPath(i18n.locale(), vehicleId)"
      >← {{ copy().back }}</a
    >
    @if (loading()) {
      <p class="muted">{{ copy().loading }}</p>
    } @else if (error()) {
      <p
        class="form-error"
        role="alert"
      >
        {{ error() }}
      </p>
    } @else if (entry(); as item) {
      <div class="garage-heading">
        <div>
          <p class="eyebrow">{{ item.isFullTank ? copy().full : copy().partial }}</p>
          <h1>{{ date(item.refueledAt) }}</h1>
        </div>
        <a
          tnButton
          [routerLink]="fuelLogPath(i18n.locale(), vehicleId, item.id, 'edit')"
          >{{ copy().edit }}</a
        >
      </div>
      <dl class="vehicle-facts">
        <div>
          <dt>{{ copy().odometer }}</dt>
          <dd>{{ item.odometerKm.toLocaleString() }} km</dd>
        </div>
        <div>
          <dt>{{ copy().quantity }}</dt>
          <dd>{{ item.quantity }} L</dd>
        </div>
        <div>
          <dt>{{ copy().cost }}</dt>
          <dd>{{ money(item.totalCostVnd) }}</dd>
        </div>
        <div>
          <dt>{{ copy().price }}</dt>
          <dd>{{ money(item.effectivePricePerLiterVnd.split('.')[0]) }}/L</dd>
        </div>
        <div>
          <dt>{{ copy().station }}</dt>
          <dd>{{ item.station || '—' }}</dd>
        </div>
        <div>
          <dt>{{ copy().notes }}</dt>
          <dd>{{ item.notes || '—' }}</dd>
        </div>
      </dl>
    }
  </section>`,
  styleUrls: ['../garage/garage.scss', './fuel-log.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FuelLogEntryPageComponent implements OnInit {
  protected readonly i18n = inject(LocaleService);
  protected readonly fuelLogPath = fuelLogPath;
  private readonly route = inject(ActivatedRoute);
  protected readonly vehicleId = this.route.snapshot.paramMap.get('id')!;
  private readonly entryId = this.route.snapshot.paramMap.get('entryId')!;
  private readonly service = inject(FuelLogService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly entry = signal<FuelLogEntryResult | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  ngOnInit() {
    if (this.browser)
      void this.service
        .get(this.vehicleId, this.entryId)
        .then((item) => this.entry.set(item))
        .catch(() => this.error.set(this.copy().error))
        .finally(() => this.loading.set(false));
  }
  protected date(value: string) {
    return new Intl.DateTimeFormat(this.i18n.locale() === 'vi' ? 'vi-VN' : 'en-GB', {
      dateStyle: 'long',
      timeStyle: 'short',
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
  protected copy() {
    return this.i18n.locale() === 'vi'
      ? {
          back: 'Quay lại nhật ký',
          loading: 'Đang tải…',
          error: 'Không thể tải lần đổ nhiên liệu.',
          full: 'Đầy bình',
          partial: 'Đổ một phần',
          edit: 'Chỉnh sửa',
          odometer: 'Công-tơ-mét',
          quantity: 'Nhiên liệu',
          cost: 'Tổng tiền',
          price: 'Giá thực tế',
          station: 'Trạm / địa điểm',
          notes: 'Ghi chú',
        }
      : {
          back: 'Back to fuel log',
          loading: 'Loading…',
          error: 'Unable to load the fuel entry.',
          full: 'Full tank',
          partial: 'Partial fill',
          edit: 'Edit',
          odometer: 'Odometer',
          quantity: 'Fuel',
          cost: 'Total cost',
          price: 'Actual price',
          station: 'Station / location',
          notes: 'Notes',
        };
  }
}
