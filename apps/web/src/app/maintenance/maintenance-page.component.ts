import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type {
  MaintenanceHistoryListResult,
  MaintenancePlanListResult,
  MaintenancePlanResult,
  MaintenanceSummary,
} from '@tranhanh/shared';
import { ButtonDirective } from '../design-system/button.directive';
import { LocaleService } from '../i18n/locale.service';
import { garagePath, maintenanceHistoryPath, maintenancePath, maintenancePlanPath } from '../i18n/routes';
import { MaintenanceService } from './maintenance.service';

@Component({
  selector: 'tn-maintenance-page',
  imports: [RouterLink, ButtonDirective],
  template: `<section class="container section stack garage-detail maintenance-page">
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
      <div class="cluster">
        <a
          tnButton
          [routerLink]="maintenanceHistoryPath(i18n.locale(), vehicleId, undefined, 'add')"
          >{{ copy().addHistory }}</a
        >
        <a
          tnButton
          variant="secondary"
          [routerLink]="maintenancePlanPath(i18n.locale(), vehicleId, undefined, 'add')"
          >{{ copy().addPlan }}</a
        >
      </div>
    </header>
    <label class="archive-toggle"
      ><input
        type="checkbox"
        [checked]="showArchived()"
        (change)="toggle($event)"
      />
      {{ copy().showArchived }}</label
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
    } @else {
      @if (summary(); as s) {
        <div class="maintenance-attention">
          <span
            ><strong>{{ s.activeHistoryCount }}</strong> {{ copy().historyCount }}</span
          ><span [class.attention-danger]="s.duePlanCount > 0"
            ><strong>{{ s.duePlanCount }}</strong> {{ copy().due }}</span
          ><span [class.attention-warning]="s.dueSoonPlanCount > 0"
            ><strong>{{ s.dueSoonPlanCount }}</strong> {{ copy().dueSoon }}</span
          ><span
            ><strong>{{ money(s.totalCostVnd) }}</strong> {{ copy().cost }}</span
          >
        </div>
      }
      <section class="maintenance-section stack">
        <div class="monitoring-heading">
          <div>
            <p class="eyebrow">{{ copy().plansEyebrow }}</p>
            <h2>{{ copy().plans }}</h2>
          </div>
          <a [routerLink]="maintenancePlanPath(i18n.locale(), vehicleId, undefined, 'add')">{{ copy().add }}</a>
        </div>
        @if (!plans()?.items?.length) {
          <div class="garage-empty stack">
            <h3>{{ copy().noPlans }}</h3>
            <p>{{ copy().noPlansBody }}</p>
          </div>
        } @else {
          <div class="garage-grid">
            @for (item of plans()!.items; track item.id) {
              <a
                class="vehicle-card"
                [routerLink]="maintenancePlanPath(i18n.locale(), vehicleId, item.id)"
                ><div class="cluster">
                  <span
                    class="badge"
                    [attr.data-tone]="planTone(item)"
                    >{{ planState(item) }}</span
                  >
                  @if (item.dueDate) {
                    <span class="muted">{{ item.dueDate }}</span>
                  }
                </div>
                <h3>{{ item.title }}</h3>
                <p class="muted">{{ dueText(item) }}</p></a
              >
            }
          </div>
          @if (hasMorePlans()) {
            <button
              tnButton
              variant="secondary"
              type="button"
              [loading]="plansLoadingMore()"
              (click)="loadMorePlans()"
            >
              {{ copy().loadMore }}
            </button>
          }
          @if (plansMoreError()) {
            <p
              class="feedback feedback--error"
              role="alert"
            >
              {{ plansMoreError() }}
            </p>
          }
        }
      </section>
      <section class="maintenance-section stack">
        <div class="monitoring-heading">
          <div>
            <p class="eyebrow">{{ copy().historyEyebrow }}</p>
            <h2>{{ copy().history }}</h2>
          </div>
          <a [routerLink]="maintenanceHistoryPath(i18n.locale(), vehicleId, undefined, 'add')">{{ copy().add }}</a>
        </div>
        @if (!history()?.items?.length) {
          <div class="garage-empty stack">
            <h3>{{ copy().noHistory }}</h3>
            <p>{{ copy().noHistoryBody }}</p>
          </div>
        } @else {
          <div class="garage-grid">
            @for (item of history()!.items; track item.id) {
              <a
                class="vehicle-card"
                [routerLink]="maintenanceHistoryPath(i18n.locale(), vehicleId, item.id)"
                ><div class="cluster">
                  <span
                    class="badge"
                    [attr.data-tone]="item.status === 'ARCHIVED' ? undefined : 'success'"
                    >{{ item.status === 'ARCHIVED' ? copy().archived : copy().active }}</span
                  ><span class="muted">{{ item.serviceDate }}</span>
                </div>
                <h3>{{ item.title }}</h3>
                <p>
                  {{ item.category }} · {{ item.totalCostVnd === null ? copy().unknownCost : money(item.totalCostVnd) }}
                </p>
                <small class="muted">{{
                  item.odometerKm === null ? copy().unknownMileage : item.odometerKm.toLocaleString() + ' km'
                }}</small></a
              >
            }
          </div>
          @if (hasMoreHistory()) {
            <button
              tnButton
              variant="secondary"
              type="button"
              [loading]="historyLoadingMore()"
              (click)="loadMoreHistory()"
            >
              {{ copy().loadMore }}
            </button>
          }
          @if (historyMoreError()) {
            <p
              class="feedback feedback--error"
              role="alert"
            >
              {{ historyMoreError() }}
            </p>
          }
        }
      </section>
    }
  </section>`,
  styleUrls: ['../garage/garage.scss', './maintenance.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenancePageComponent implements OnInit {
  protected readonly i18n = inject(LocaleService);
  protected readonly garagePath = garagePath;
  protected readonly maintenancePath = maintenancePath;
  protected readonly maintenanceHistoryPath = maintenanceHistoryPath;
  protected readonly maintenancePlanPath = maintenancePlanPath;
  protected readonly vehicleId = inject(ActivatedRoute).snapshot.paramMap.get('id')!;
  private readonly service = inject(MaintenanceService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly history = signal<MaintenanceHistoryListResult | null>(null);
  protected readonly plans = signal<MaintenancePlanListResult | null>(null);
  protected readonly summary = signal<MaintenanceSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly showArchived = signal(false);
  protected readonly plansLoadingMore = signal(false);
  protected readonly historyLoadingMore = signal(false);
  protected readonly plansMoreError = signal('');
  protected readonly historyMoreError = signal('');
  private readonly pageSize = 20;
  ngOnInit() {
    if (this.browser) void this.load();
  }
  protected async toggle(event: Event) {
    this.showArchived.set((event.target as HTMLInputElement).checked);
    await this.load();
  }
  protected async load() {
    this.loading.set(true);
    this.error.set('');
    this.history.set(null);
    this.plans.set(null);
    this.summary.set(null);
    this.plansMoreError.set('');
    this.historyMoreError.set('');
    try {
      const status = this.showArchived() ? 'ALL' : 'ACTIVE';
      const [history, plans, summary] = await Promise.all([
        this.service.history(this.vehicleId, status, 1, this.pageSize),
        this.service.plans(this.vehicleId, status === 'ALL' ? 'ALL' : 'ACTIVE', 1, this.pageSize),
        this.service.summary(this.vehicleId),
      ]);
      this.history.set(history);
      this.plans.set(plans);
      this.summary.set(summary);
    } catch {
      this.error.set(this.copy().error);
    } finally {
      this.loading.set(false);
    }
  }
  protected hasMorePlans() {
    const result = this.plans();
    return !!result && result.items.length < result.total;
  }
  protected hasMoreHistory() {
    const result = this.history();
    return !!result && result.items.length < result.total;
  }
  protected async loadMorePlans() {
    const current = this.plans();
    if (!current || current.items.length >= current.total || this.plansLoadingMore()) return;
    this.plansLoadingMore.set(true);
    this.plansMoreError.set('');
    try {
      const status = this.showArchived() ? 'ALL' : 'ACTIVE';
      const next = await this.service.plans(this.vehicleId, status, current.page + 1, this.pageSize);
      this.plans.set({ ...next, items: [...current.items, ...next.items] });
    } catch {
      this.plansMoreError.set(this.copy().loadMoreError);
    } finally {
      this.plansLoadingMore.set(false);
    }
  }
  protected async loadMoreHistory() {
    const current = this.history();
    if (!current || current.items.length >= current.total || this.historyLoadingMore()) return;
    this.historyLoadingMore.set(true);
    this.historyMoreError.set('');
    try {
      const status = this.showArchived() ? 'ALL' : 'ACTIVE';
      const next = await this.service.history(this.vehicleId, status, current.page + 1, this.pageSize);
      this.history.set({ ...next, items: [...current.items, ...next.items] });
    } catch {
      this.historyMoreError.set(this.copy().loadMoreError);
    } finally {
      this.historyLoadingMore.set(false);
    }
  }
  protected planTone(item: MaintenancePlanResult) {
    return item.dueStatus === 'DUE' ? 'danger' : item.dueStatus === 'DUE_SOON' ? 'warning' : 'success';
  }
  protected planState(item: MaintenancePlanResult) {
    const c = this.copy();
    return item.status === 'ARCHIVED'
      ? c.archived
      : item.status === 'COMPLETED'
        ? c.completed
        : item.dueStatus === 'DUE'
          ? c.due
          : item.dueStatus === 'DUE_SOON'
            ? c.dueSoon
            : item.dueStatus === 'UNKNOWN_MILEAGE'
              ? c.unknownMileage
              : c.notDue;
  }
  protected dueText(item: MaintenancePlanResult) {
    const c = this.copy();
    if (item.status !== 'ACTIVE') return item.status === 'COMPLETED' ? c.completed : c.archived;
    if (item.dueStatus === 'UNKNOWN_MILEAGE') return c.unknownMileage;
    return item.dueOdometerKm === null
      ? c.dateDue + ': ' + item.dueDate
      : c.odometerDue + ': ' + item.dueOdometerKm.toLocaleString() + ' km';
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
          back: 'Quay lại xe',
          eyebrow: 'DỮ LIỆU RIÊNG TƯ',
          title: 'Bảo dưỡng',
          intro: 'Lưu lịch sử đã làm và kế hoạch sắp tới theo xe.',
          addHistory: 'Thêm lịch sử',
          addPlan: 'Thêm kế hoạch',
          showArchived: 'Hiện bản ghi đã lưu trữ',
          loading: 'Đang tải…',
          retry: 'Thử lại',
          loadMore: 'Tải thêm',
          loadMoreError: 'Không thể tải thêm. Hãy thử lại.',
          error: 'Không thể tải dữ liệu bảo dưỡng.',
          plansEyebrow: 'KẾ HOẠCH',
          plans: 'Kế hoạch sắp tới',
          historyEyebrow: 'LỊCH SỬ',
          history: 'Lịch sử bảo dưỡng',
          add: 'Thêm',
          noPlans: 'Chưa có kế hoạch',
          noPlansBody: 'Tạo một kế hoạch bằng ngày hoặc công-tơ-mét.',
          noHistory: 'Chưa có lịch sử',
          noHistoryBody: 'Ghi lại lần bảo dưỡng đầu tiên của xe.',
          historyCount: 'mục lịch sử',
          due: 'đến hạn',
          dueSoon: 'sắp đến hạn',
          cost: 'chi phí',
          archived: 'Đã lưu trữ',
          active: 'Đang dùng',
          completed: 'Đã hoàn tất',
          notDue: 'Chưa đến hạn',
          unknownMileage: 'Chưa biết công-tơ-mét',
          unknownCost: 'Chưa ghi chi phí',
          dateDue: 'Ngày đến hạn',
          odometerDue: 'Công-tơ-mét',
        }
      : {
          back: 'Back to vehicle',
          eyebrow: 'PRIVATE DATA',
          title: 'Maintenance',
          intro: 'Keep vehicle service history and user-defined upcoming plans.',
          addHistory: 'Add history',
          addPlan: 'Add plan',
          showArchived: 'Show archived records',
          loading: 'Loading…',
          retry: 'Retry',
          loadMore: 'Load more',
          loadMoreError: 'Unable to load more. Try again.',
          error: 'Unable to load maintenance data.',
          plansEyebrow: 'PLANS',
          plans: 'Upcoming plans',
          historyEyebrow: 'HISTORY',
          history: 'Service history',
          add: 'Add',
          noPlans: 'No plans yet',
          noPlansBody: 'Create a plan with a date or odometer threshold.',
          noHistory: 'No history yet',
          noHistoryBody: 'Record the first service for this vehicle.',
          historyCount: 'history records',
          due: 'due',
          dueSoon: 'due soon',
          cost: 'cost',
          archived: 'Archived',
          active: 'Active',
          completed: 'Completed',
          notDue: 'Not due',
          unknownMileage: 'Mileage unknown',
          unknownCost: 'Cost not recorded',
          dateDue: 'Due date',
          odometerDue: 'Odometer',
        };
  }
}
