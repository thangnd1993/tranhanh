import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { MaintenanceSummary } from '@tranhanh/shared';
import { LocaleService } from '../i18n/locale.service';
import { maintenancePath } from '../i18n/routes';
import { MaintenanceService } from './maintenance.service';

@Component({
  selector: 'tn-maintenance-summary',
  imports: [RouterLink],
  template: `<section class="private-summary stack">
    <div class="cluster">
      <h2>{{ vi() ? 'Bảo dưỡng' : 'Maintenance' }}</h2>
      <a [routerLink]="maintenancePath(i18n.locale(), vehicleId())">{{ vi() ? 'Quản lý' : 'Manage' }}</a>
    </div>
    @if (summary(); as s) {
      <div class="maintenance-attention">
        <span
          ><strong>{{ s.activeHistoryCount }}</strong> {{ vi() ? 'lịch sử' : 'history records' }}</span
        >
        <span [class.attention-danger]="s.duePlanCount > 0"
          ><strong>{{ s.duePlanCount }}</strong> {{ vi() ? 'đến hạn' : 'due' }}</span
        >
        <span [class.attention-warning]="s.dueSoonPlanCount > 0"
          ><strong>{{ s.dueSoonPlanCount }}</strong> {{ vi() ? 'sắp đến hạn' : 'due soon' }}</span
        >
      </div>
      <p class="muted">
        {{ vi() ? 'Tổng chi phí đã ghi: ' : 'Recorded cost: ' }}{{ money(s.totalCostVnd) }}
        @if (s.unknownCostHistoryCount > 0) {
          · {{ s.unknownCostHistoryCount }} {{ vi() ? 'mục chưa biết chi phí' : 'records with unknown cost' }}
        }
      </p>
    } @else {
      <p class="muted">{{ vi() ? 'Chưa có dữ liệu bảo dưỡng.' : 'No maintenance information yet.' }}</p>
    }
  </section>`,
  styleUrls: ['./maintenance.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenanceSummaryComponent implements OnInit {
  readonly vehicleId = input.required<string>();
  protected readonly i18n = inject(LocaleService);
  protected readonly maintenancePath = maintenancePath;
  private readonly service = inject(MaintenanceService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly summary = signal<MaintenanceSummary | null>(null);
  ngOnInit() {
    if (this.browser)
      void this.service
        .summary(this.vehicleId())
        .then((value) => this.summary.set(value))
        .catch(() => undefined);
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
}
