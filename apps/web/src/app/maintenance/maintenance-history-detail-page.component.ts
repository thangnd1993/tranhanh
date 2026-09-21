import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { MaintenanceHistoryResult } from '@tranhanh/shared';
import { ButtonDirective } from '../design-system/button.directive';
import { LocaleService } from '../i18n/locale.service';
import { maintenanceHistoryPath, maintenancePath } from '../i18n/routes';
import { MaintenanceService } from './maintenance.service';

@Component({
  selector: 'tn-maintenance-history-detail-page',
  imports: [RouterLink, ButtonDirective],
  template: `<section class="container section stack garage-form-wrap maintenance-detail">
    <a
      class="back-link"
      [routerLink]="maintenancePath(i18n.locale(), vehicleId)"
      >← {{ copy().back }}</a
    >
    @if (loading()) {
      <p
        class="muted"
        role="status"
      >
        {{ copy().loading }}
      </p>
    } @else if (error()) {
      <div
        class="feedback feedback--error stack"
        role="alert"
      >
        <p>{{ error() }}</p>
        <button
          tnButton
          variant="secondary"
          type="button"
          (click)="load()"
        >
          {{ copy().retry }}
        </button>
      </div>
    } @else if (item(); as h) {
      <header class="garage-heading">
        <div>
          <p class="eyebrow">{{ h.status === 'ARCHIVED' ? copy().archived : copy().eyebrow }}</p>
          <h1>{{ h.title }}</h1>
          <p class="muted">{{ h.category }} · {{ h.serviceDate }}</p>
        </div>
        <a
          tnButton
          [routerLink]="maintenanceHistoryPath(i18n.locale(), vehicleId, h.id, 'edit')"
          >{{ copy().edit }}</a
        >
      </header>
      <dl class="vehicle-facts">
        <div>
          <dt>{{ copy().date }}</dt>
          <dd>{{ h.serviceDate }}</dd>
        </div>
        <div>
          <dt>{{ copy().odometer }}</dt>
          <dd>{{ h.odometerKm === null ? copy().unknown : h.odometerKm.toLocaleString() + ' km' }}</dd>
        </div>
        <div>
          <dt>{{ copy().cost }}</dt>
          <dd>{{ h.totalCostVnd === null ? copy().unknown : money(h.totalCostVnd) }}</dd>
        </div>
        <div>
          <dt>{{ copy().workshop }}</dt>
          <dd>{{ h.workshop || '—' }}</dd>
        </div>
        <div>
          <dt>{{ copy().notes }}</dt>
          <dd>{{ h.notes || '—' }}</dd>
        </div>
      </dl>
      <div class="cluster">
        @if (h.status === 'ACTIVE') {
          <button
            tnButton
            variant="ghost"
            type="button"
            (click)="archive()"
          >
            {{ copy().archive }}
          </button>
        } @else {
          <button
            tnButton
            variant="secondary"
            type="button"
            [loading]="busy()"
            (click)="restore()"
          >
            {{ copy().restore }}
          </button>
        }
      </div>
    }
  </section>`,
  styleUrls: ['../garage/garage.scss', './maintenance.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenanceHistoryDetailPageComponent implements OnInit {
  protected readonly i18n = inject(LocaleService);
  protected readonly maintenancePath = maintenancePath;
  protected readonly maintenanceHistoryPath = maintenanceHistoryPath;
  private readonly route = inject(ActivatedRoute);
  protected readonly vehicleId = this.route.snapshot.paramMap.get('id')!;
  private readonly historyId = this.route.snapshot.paramMap.get('historyId')!;
  private readonly service = inject(MaintenanceService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly item = signal<MaintenanceHistoryResult | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  ngOnInit() {
    if (this.browser) void this.load();
  }
  protected async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.item.set(await this.service.getHistory(this.vehicleId, this.historyId));
    } catch {
      this.error.set(this.copy().error);
    } finally {
      this.loading.set(false);
    }
  }
  protected async archive() {
    if (!confirm(this.copy().archiveConfirm)) return;
    await this.change('archive');
  }
  protected async restore() {
    await this.change('restore');
  }
  private async change(action: 'archive' | 'restore') {
    this.busy.set(true);
    this.error.set('');
    try {
      this.item.set(await this.service.historyLifecycle(this.vehicleId, this.historyId, action));
    } catch {
      this.error.set(this.copy().error);
    } finally {
      this.busy.set(false);
    }
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
          back: 'Quay lại bảo dưỡng',
          eyebrow: 'LỊCH SỬ RIÊNG TƯ',
          archived: 'ĐÃ LƯU TRỮ',
          loading: 'Đang tải…',
          retry: 'Thử lại',
          error: 'Không thể tải lịch sử.',
          edit: 'Chỉnh sửa',
          date: 'Ngày thực hiện',
          odometer: 'Công-tơ-mét',
          cost: 'Chi phí',
          workshop: 'Xưởng / nơi làm',
          notes: 'Ghi chú',
          unknown: 'Chưa biết',
          archive: 'Lưu trữ',
          restore: 'Khôi phục',
          archiveConfirm: 'Lưu trữ bản ghi này? Bản ghi sẽ không còn được tính vào tổng chi phí.',
        }
      : {
          back: 'Back to maintenance',
          eyebrow: 'PRIVATE HISTORY',
          archived: 'ARCHIVED',
          loading: 'Loading…',
          retry: 'Retry',
          error: 'Unable to load history.',
          edit: 'Edit',
          date: 'Service date',
          odometer: 'Odometer',
          cost: 'Cost',
          workshop: 'Workshop / place',
          notes: 'Notes',
          unknown: 'Unknown',
          archive: 'Archive',
          restore: 'Restore',
          archiveConfirm: 'Archive this record? It will no longer count toward total cost.',
        };
  }
}
