import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { VehicleExpenseSummary } from '@tranhanh/shared';
import { LocaleService } from '../i18n/locale.service';
import { expensePath } from '../i18n/routes';
import { VehicleExpenseService } from './vehicle-expense.service';

@Component({
  selector: 'tn-vehicle-expense-summary',
  imports: [RouterLink],
  template: `<section class="private-summary stack">
    <div class="cluster">
      <h2>{{ vi() ? 'Chi phí' : 'Expenses' }}</h2>
      <a [routerLink]="expensePath(i18n.locale(), vehicleId())">{{ vi() ? 'Xem sổ chi phí' : 'View ledger' }}</a>
    </div>
    @if (summary(); as s) {
      <p>
        {{ vi() ? 'Đã ghi trong tháng' : 'Recorded this month' }}:
        <strong>{{ money(s.recordedTotalCostVnd) }}</strong>
      </p>
      @if (s.incomplete) {
        <p class="muted">
          {{ s.unknownMaintenanceCostCount }} ·
          {{ vi() ? 'mục bảo dưỡng chưa biết chi phí' : 'maintenance records have unknown cost' }}
        </p>
      }
    }
  </section>`,
  styleUrls: ['../garage/vehicle-documents.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleExpenseSummaryComponent implements OnInit {
  readonly vehicleId = input.required<string>();
  protected readonly i18n = inject(LocaleService);
  protected readonly expensePath = expensePath;
  private readonly service = inject(VehicleExpenseService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly summary = signal<VehicleExpenseSummary | null>(null);

  ngOnInit() {
    if (this.browser)
      void this.service.summary(this.vehicleId(), this.currentMonth()).then((value) => this.summary.set(value));
  }

  protected vi() {
    return this.i18n.locale() === 'vi';
  }

  protected money(value: string) {
    return new Intl.NumberFormat(this.vi() ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(BigInt(value));
  }

  private currentMonth() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts();
    return `${parts.find((part) => part.type === 'year')!.value}-${parts.find((part) => part.type === 'month')!.value}`;
  }
}
