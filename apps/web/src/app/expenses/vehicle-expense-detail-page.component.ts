import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { VehicleExpenseCategory, VehicleExpenseResult } from '@tranhanh/shared';
import { ButtonDirective } from '../design-system/button.directive';
import { LocaleService } from '../i18n/locale.service';
import { expensePath } from '../i18n/routes';
import { VehicleExpenseService } from './vehicle-expense.service';

@Component({
  selector: 'tn-vehicle-expense-detail-page',
  imports: [RouterLink, ButtonDirective],
  template: `<section class="container section stack garage-form-wrap expense-detail-page">
    <a
      class="back-link"
      [routerLink]="expensePath(i18n.locale(), vehicleId)"
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
    } @else if (item(); as expense) {
      <header class="garage-heading">
        <div>
          <p class="eyebrow">{{ expense.status === 'ARCHIVED' ? copy().archived : copy().eyebrow }}</p>
          <h1>{{ expense.title }}</h1>
          <p class="muted">{{ categoryLabel(expense.category) }} · {{ expense.expenseDate }}</p>
        </div>
        <a
          tnButton
          [routerLink]="expensePath(i18n.locale(), vehicleId, expense.id, 'edit')"
          >{{ copy().edit }}</a
        >
      </header>
      <dl class="vehicle-facts">
        <div>
          <dt>{{ copy().category }}</dt>
          <dd>{{ categoryLabel(expense.category) }}</dd>
        </div>
        <div>
          <dt>{{ copy().date }}</dt>
          <dd>{{ expense.expenseDate }}</dd>
        </div>
        <div>
          <dt>{{ copy().cost }}</dt>
          <dd>{{ money(expense.totalCostVnd) }}</dd>
        </div>
        <div>
          <dt>{{ copy().notes }}</dt>
          <dd>{{ expense.notes || '—' }}</dd>
        </div>
      </dl>
      <div class="expense-detail-actions">
        @if (expense.status === 'ACTIVE') {
          <button
            tnButton
            variant="ghost"
            type="button"
            [loading]="busy()"
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
  styleUrls: ['../garage/garage.scss', './vehicle-expenses.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleExpenseDetailPageComponent implements OnInit {
  protected readonly i18n = inject(LocaleService);
  protected readonly expensePath = expensePath;
  private readonly route = inject(ActivatedRoute);
  protected readonly vehicleId = this.route.snapshot.paramMap.get('id')!;
  private readonly expenseId = this.route.snapshot.paramMap.get('expenseId')!;
  private readonly service = inject(VehicleExpenseService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly item = signal<VehicleExpenseResult | null>(null);
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
      this.item.set(await this.service.get(this.vehicleId, this.expenseId));
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
      this.item.set(await this.service.lifecycle(this.vehicleId, this.expenseId, action));
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

  protected categoryLabel(category: VehicleExpenseCategory) {
    const labels =
      this.i18n.locale() === 'vi'
        ? { INSURANCE: 'Bảo hiểm', REGISTRATION: 'Đăng ký', TOLL: 'Trạm thu phí', PARKING: 'Đỗ xe', OTHER: 'Khác' }
        : { INSURANCE: 'Insurance', REGISTRATION: 'Registration', TOLL: 'Toll', PARKING: 'Parking', OTHER: 'Other' };
    return labels[category];
  }

  protected copy() {
    return this.i18n.locale() === 'vi'
      ? {
          back: 'Quay lại sổ chi phí',
          eyebrow: 'KHOẢN CHI RIÊNG TƯ',
          archived: 'ĐÃ LƯU TRỮ',
          loading: 'Đang tải…',
          retry: 'Thử lại',
          error: 'Không thể tải khoản chi.',
          edit: 'Chỉnh sửa',
          category: 'Nhóm',
          date: 'Ngày',
          cost: 'Chi phí',
          notes: 'Ghi chú',
          archive: 'Lưu trữ',
          restore: 'Khôi phục',
          archiveConfirm: 'Lưu trữ khoản chi này? Khoản này sẽ không còn tính vào tổng.',
        }
      : {
          back: 'Back to expense ledger',
          eyebrow: 'PRIVATE MANUAL ENTRY',
          archived: 'ARCHIVED',
          loading: 'Loading…',
          retry: 'Retry',
          error: 'Unable to load the expense.',
          edit: 'Edit',
          category: 'Category',
          date: 'Date',
          cost: 'Cost',
          notes: 'Notes',
          archive: 'Archive',
          restore: 'Restore',
          archiveConfirm: 'Archive this expense? It will no longer count toward totals.',
        };
  }
}
