import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { VehicleExpenseLedgerEntry, VehicleExpenseLedgerResult, VehicleExpenseSummary } from '@tranhanh/shared';
import { ButtonDirective } from '../design-system/button.directive';
import { LocaleService } from '../i18n/locale.service';
import { expensePath, fuelLogPath, garagePath, maintenanceHistoryPath } from '../i18n/routes';
import { VehicleExpenseService } from './vehicle-expense.service';

@Component({
  selector: 'tn-vehicle-expenses-page',
  imports: [RouterLink, ButtonDirective],
  template: `<section class="container section stack garage-detail expenses-page">
    <a
      class="back-link"
      [routerLink]="garagePath(i18n.locale(), vehicleId)"
      >← {{ copy().back }}</a
    >
    <header class="garage-heading">
      <div>
        <p class="eyebrow">{{ copy().eyebrow }}</p>
        <h1>{{ copy().title }}</h1>
        <p class="muted">{{ copy().intro }}</p>
      </div>
      <a
        tnButton
        [routerLink]="expensePath(i18n.locale(), vehicleId, undefined, 'add')"
        >{{ copy().add }}</a
      >
    </header>

    <div class="expense-filters cluster">
      <label class="field-label"
        >{{ copy().month }}
        <input
          type="month"
          [value]="month()"
          (change)="changeMonth($event)"
        />
      </label>
      <label class="archive-toggle"
        ><input
          type="checkbox"
          [checked]="showArchived()"
          (change)="toggleArchived($event)"
        />
        {{ copy().showArchived }}</label
      >
    </div>

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
    } @else {
      @if (summary(); as s) {
        <div class="expense-summary-grid">
          <article class="private-summary stack">
            <span class="eyebrow">{{ copy().recorded }}</span>
            <strong class="expense-total">{{ money(s.recordedTotalCostVnd) }}</strong>
            <span class="muted">{{ s.totalCount }} {{ copy().records }}</span>
          </article>
          <article class="private-summary stack">
            <span class="eyebrow">{{ copy().fuel }}</span>
            <strong>{{ money(s.fuel.recordedTotalCostVnd) }}</strong>
            <span class="muted">{{ s.fuel.count }} {{ copy().records }}</span>
          </article>
          <article class="private-summary stack">
            <span class="eyebrow">{{ copy().maintenance }}</span>
            <strong>{{ money(s.maintenance.recordedTotalCostVnd) }}</strong>
            <span class="muted">{{ s.maintenance.count }} {{ copy().records }}</span>
          </article>
          <article class="private-summary stack">
            <span class="eyebrow">{{ copy().manual }}</span>
            <strong>{{ money(s.manual.recordedTotalCostVnd) }}</strong>
            <span class="muted">{{ s.manual.count }} {{ copy().records }}</span>
          </article>
        </div>
        @if (s.incomplete) {
          <p
            class="feedback feedback--warning"
            role="status"
          >
            {{ s.unknownMaintenanceCostCount }} {{ copy().unknownNotice }}
          </p>
        }
        @if (s.byCategory.length) {
          <section class="private-summary stack">
            <h2>{{ copy().breakdown }}</h2>
            <div class="expense-breakdown">
              @for (item of s.byCategory; track item.category) {
                <div class="expense-breakdown-row">
                  <span>{{ category(item.category) }}</span>
                  <strong>{{ money(item.recordedTotalCostVnd) }}</strong>
                </div>
              }
            </div>
          </section>
        }
      }

      <section class="private-summary stack">
        <div class="monitoring-heading">
          <div>
            <p class="eyebrow">{{ copy().ledgerEyebrow }}</p>
            <h2>{{ copy().ledger }}</h2>
          </div>
          <a [routerLink]="expensePath(i18n.locale(), vehicleId, undefined, 'add')">{{ copy().add }}</a>
        </div>
        @if (!ledger()?.items?.length) {
          <div class="garage-empty stack">
            <h3>{{ copy().empty }}</h3>
            <p>{{ copy().emptyBody }}</p>
          </div>
        } @else {
          <div
            class="expense-ledger"
            role="table"
            [attr.aria-label]="copy().ledger"
          >
            <div
              class="expense-ledger-row expense-ledger-head"
              role="row"
            >
              <span role="columnheader">{{ copy().date }}</span>
              <span role="columnheader">{{ copy().source }}</span>
              <span role="columnheader">{{ copy().description }}</span>
              <span role="columnheader">{{ copy().cost }}</span>
              <span role="columnheader"></span>
            </div>
            @for (item of ledger()!.items; track item.source + item.sourceId) {
              <div
                class="expense-ledger-row"
                role="row"
              >
                <span role="cell">{{ date(item.date) }}</span>
                <span role="cell"
                  ><span class="badge">{{ sourceLabel(item.source) }}</span></span
                >
                <span role="cell">
                  <strong>{{ item.title }}</strong>
                  <small class="muted">{{ category(item.category) }}</small>
                </span>
                <span role="cell">{{ item.totalCostVnd === null ? copy().unknown : money(item.totalCostVnd) }}</span>
                <span role="cell">
                  <a [routerLink]="sourceLink(item)">{{ copy().open }}</a>
                </span>
              </div>
            }
          </div>
          <div class="pagination cluster">
            <button
              tnButton
              variant="secondary"
              type="button"
              [disabled]="page() <= 1"
              (click)="previous()"
            >
              {{ copy().previous }}
            </button>
            <span class="muted">{{ page() }} / {{ pageCount() }}</span>
            <button
              tnButton
              variant="secondary"
              type="button"
              [disabled]="page() >= pageCount()"
              (click)="next()"
            >
              {{ copy().next }}
            </button>
          </div>
        }
      </section>
    }
  </section>`,
  styleUrls: ['../garage/garage.scss', './vehicle-expenses.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleExpensesPageComponent implements OnInit {
  protected readonly i18n = inject(LocaleService);
  protected readonly garagePath = garagePath;
  protected readonly expensePath = expensePath;
  protected readonly vehicleId = inject(ActivatedRoute).snapshot.paramMap.get('id')!;
  private readonly service = inject(VehicleExpenseService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private request = 0;
  private readonly pageSize = 20;
  protected readonly ledger = signal<VehicleExpenseLedgerResult | null>(null);
  protected readonly summary = signal<VehicleExpenseSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly month = signal(this.currentMonth());
  protected readonly page = signal(1);
  protected readonly showArchived = signal(false);

  ngOnInit() {
    if (this.browser) void this.load();
  }

  protected async load() {
    const request = ++this.request;
    this.loading.set(true);
    this.error.set('');
    try {
      const status = this.showArchived() ? 'ALL' : 'ACTIVE';
      const [ledger, summary] = await Promise.all([
        this.service.ledger(this.vehicleId, status, this.month(), this.page(), this.pageSize),
        this.service.summary(this.vehicleId, this.month()),
      ]);
      if (request !== this.request) return;
      this.ledger.set(ledger);
      this.summary.set(summary);
    } catch {
      if (request === this.request) this.error.set(this.copy().error);
    } finally {
      if (request === this.request) this.loading.set(false);
    }
  }

  protected changeMonth(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return;
    this.month.set(value);
    this.page.set(1);
    void this.load();
  }

  protected toggleArchived(event: Event) {
    this.showArchived.set((event.target as HTMLInputElement).checked);
    this.page.set(1);
    void this.load();
  }

  protected previous() {
    if (this.page() <= 1) return;
    this.page.update((page) => page - 1);
    void this.load();
  }

  protected next() {
    if (this.page() >= this.pageCount()) return;
    this.page.update((page) => page + 1);
    void this.load();
  }

  protected pageCount() {
    return Math.max(1, Math.ceil((this.ledger()?.total ?? 0) / this.pageSize));
  }

  protected date(value: string) {
    return new Intl.DateTimeFormat(this.i18n.locale() === 'vi' ? 'vi-VN' : 'en-GB', {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(new Date(`${value}T00:00:00.000Z`));
  }

  protected money(value: string) {
    return new Intl.NumberFormat(this.i18n.locale() === 'vi' ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(BigInt(value));
  }

  protected sourceLabel(source: VehicleExpenseLedgerEntry['source']) {
    return source === 'FUEL'
      ? this.copy().fuel
      : source === 'MAINTENANCE'
        ? this.copy().maintenance
        : this.copy().manual;
  }

  protected category(value: string) {
    const labels =
      this.i18n.locale() === 'vi'
        ? {
            FUEL: 'Nhiên liệu',
            MAINTENANCE: 'Bảo dưỡng',
            INSURANCE: 'Bảo hiểm',
            REGISTRATION: 'Đăng ký',
            TOLL: 'Trạm thu phí',
            PARKING: 'Đỗ xe',
            OTHER: 'Khác',
          }
        : {
            FUEL: 'Fuel',
            MAINTENANCE: 'Maintenance',
            INSURANCE: 'Insurance',
            REGISTRATION: 'Registration',
            TOLL: 'Toll',
            PARKING: 'Parking',
            OTHER: 'Other',
          };
    return labels[value as keyof typeof labels] || value;
  }

  protected sourceLink(item: VehicleExpenseLedgerEntry) {
    if (item.source === 'FUEL') return fuelLogPath(this.i18n.locale(), this.vehicleId, item.sourceId);
    if (item.source === 'MAINTENANCE') return maintenanceHistoryPath(this.i18n.locale(), this.vehicleId, item.sourceId);
    return expensePath(this.i18n.locale(), this.vehicleId, item.sourceId);
  }

  protected copy() {
    return this.i18n.locale() === 'vi'
      ? {
          back: 'Quay lại xe',
          eyebrow: 'DỮ LIỆU RIÊNG TƯ',
          title: 'Chi phí xe',
          intro: 'Tổng hợp chi phí đã ghi theo tháng, không tạo bản sao nhiên liệu hoặc bảo dưỡng.',
          add: 'Thêm chi phí',
          month: 'Tháng',
          showArchived: 'Hiện bản ghi đã lưu trữ',
          loading: 'Đang tải…',
          retry: 'Thử lại',
          recorded: 'ĐÃ GHI',
          records: 'bản ghi',
          fuel: 'Nhiên liệu',
          maintenance: 'Bảo dưỡng',
          manual: 'Khoản khác',
          unknownNotice: 'bản ghi bảo dưỡng chưa biết chi phí; tổng là phần chi phí đã ghi.',
          breakdown: 'Theo nhóm',
          ledgerEyebrow: 'SỔ CHI PHÍ',
          ledger: 'Tất cả khoản chi',
          empty: 'Chưa có chi phí trong tháng này',
          emptyBody: 'Thêm bảo hiểm, đăng ký, trạm thu phí, đỗ xe hoặc khoản khác.',
          date: 'Ngày',
          source: 'Nguồn',
          description: 'Mô tả',
          cost: 'Chi phí',
          unknown: 'Chưa biết',
          open: 'Mở bản gốc',
          previous: 'Trước',
          next: 'Sau',
          error: 'Không thể tải sổ chi phí.',
        }
      : {
          back: 'Back to vehicle',
          eyebrow: 'PRIVATE DATA',
          title: 'Vehicle expenses',
          intro: 'Monthly recorded spending without duplicating fuel or maintenance sources.',
          add: 'Add expense',
          month: 'Month',
          showArchived: 'Show archived records',
          loading: 'Loading…',
          retry: 'Retry',
          recorded: 'RECORDED',
          records: 'records',
          fuel: 'Fuel',
          maintenance: 'Maintenance',
          manual: 'Other',
          unknownNotice: 'maintenance records have unknown cost; the total contains recorded costs only.',
          breakdown: 'By category',
          ledgerEyebrow: 'EXPENSE LEDGER',
          ledger: 'All spending',
          empty: 'No expenses in this month',
          emptyBody: 'Add insurance, registration, toll, parking or another expense.',
          date: 'Date',
          source: 'Source',
          description: 'Description',
          cost: 'Cost',
          unknown: 'Unknown',
          open: 'Open original',
          previous: 'Previous',
          next: 'Next',
          error: 'Unable to load the expense ledger.',
        };
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
