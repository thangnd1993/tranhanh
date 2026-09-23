import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { VehicleDashboardFeatureLink, VehicleDashboardResult } from '@tranhanh/shared';
import { AuthService } from '../auth/auth.service';
import { ButtonDirective } from '../design-system/button.directive';
import { formatDate, formatDateTime, formatVnd } from '../i18n/format';
import { LocaleService } from '../i18n/locale.service';
import {
  dashboardPath,
  documentPath,
  expensePath,
  fuelLogPath,
  garagePath,
  maintenancePath,
  pagePaths,
} from '../i18n/routes';
import { DashboardService } from './dashboard.service';

@Component({
  selector: 'tn-dashboard-page',
  imports: [RouterLink, ButtonDirective],
  template: `<section class="container section stack dashboard-page">
    <div class="dashboard-heading">
      <div>
        <p class="eyebrow">{{ i18n.t('dashboard.private') }}</p>
        <h1>{{ i18n.t('dashboard.title') }}</h1>
        <p class="muted">{{ i18n.t('dashboard.intro') }}</p>
      </div>
      <div class="cluster dashboard-heading-links">
        <a [routerLink]="garagePath(i18n.locale())">{{ i18n.t('garage.title') }}</a>
        <a [routerLink]="i18n.path('account')">{{ i18n.t('auth.account') }}</a>
      </div>
    </div>

    @if (loading()) {
      <p
        class="dashboard-feedback muted"
        role="status"
        aria-live="polite"
      >
        {{ i18n.t('common.loading') }}
      </p>
    } @else if (error()) {
      <div
        class="dashboard-feedback dashboard-error stack"
        role="alert"
      >
        <p>{{ error() }}</p>
        <button
          tnButton
          type="button"
          variant="secondary"
          (click)="retry()"
        >
          {{ i18n.t('common.retry') }}
        </button>
      </div>
    } @else if (data(); as dashboard) {
      @if (dashboard.selectedVehicle; as vehicle) {
        <div class="dashboard-selector-panel">
          <label for="dashboard-vehicle">{{ i18n.t('dashboard.vehicleSelector') }}</label>
          <select
            class="control"
            id="dashboard-vehicle"
            [value]="selectedId()"
            (change)="selectVehicle($event)"
          >
            @for (option of dashboard.vehicles; track option.id) {
              <option [value]="option.id">
                {{ option.displayName }} · {{ option.licensePlate }}
                @if (option.isPrimary) {
                  ({{ i18n.t('garage.primary') }})
                }
              </option>
            }
          </select>
          <p class="caption">{{ dashboard.activeVehicleCount }} {{ i18n.t('dashboard.activeVehicleCount') }}</p>
        </div>

        <div class="dashboard-grid">
          <article class="dashboard-card dashboard-card--vehicle stack">
            <div class="cluster">
              <p class="eyebrow">{{ i18n.t('dashboard.selectedVehicle') }}</p>
              @if (vehicle.isPrimary) {
                <span
                  class="badge"
                  data-tone="success"
                  >{{ i18n.t('garage.primary') }}</span
                >
              }
            </div>
            <h2>{{ vehicle.displayName }}</h2>
            <strong class="plate">{{ vehicle.licensePlate }}</strong>
            <p class="muted">{{ typeLabel(vehicle.vehicleType) }}</p>
            <dl class="dashboard-facts">
              <div>
                <dt>{{ i18n.t('dashboard.odometer') }}</dt>
                <dd>
                  @if (vehicle.currentOdometerKm === null) {
                    {{ i18n.t('dashboard.unknownValue') }}
                  } @else {
                    {{ vehicle.currentOdometerKm.toLocaleString() }} km
                  }
                </dd>
              </div>
            </dl>
          </article>

          <article class="dashboard-card stack">
            <div class="dashboard-card-heading">
              <h2>{{ i18n.t('dashboard.documentsTitle') }}</h2>
              <a [routerLink]="featurePath(vehicle.id, 'DOCUMENTS')">{{ i18n.t('dashboard.view') }}</a>
            </div>
            @if (dashboard.documentAttention; as documents) {
              <div class="dashboard-metrics">
                <span [class.metric-danger]="documents.expired > 0">
                  <strong>{{ documents.expired }}</strong> {{ i18n.t('dashboard.expired') }}
                </span>
                <span [class.metric-warning]="documents.expiringSoon > 0">
                  <strong>{{ documents.expiringSoon }}</strong> {{ i18n.t('dashboard.expiringSoon') }}
                </span>
              </div>
              <p class="muted small">
                @if (documents.nextExpiry) {
                  {{ i18n.t('dashboard.nextExpiry') }}: {{ dateOnly(documents.nextExpiry) }}
                } @else {
                  {{ i18n.t('dashboard.noExpiryAttention') }}
                }
              </p>
            }
          </article>

          <article class="dashboard-card stack">
            <div class="dashboard-card-heading">
              <h2>{{ i18n.t('dashboard.maintenanceTitle') }}</h2>
              <a [routerLink]="featurePath(vehicle.id, 'MAINTENANCE')">{{ i18n.t('dashboard.view') }}</a>
            </div>
            @if (dashboard.maintenance; as maintenance) {
              <div class="dashboard-metrics">
                <span [class.metric-danger]="maintenance.duePlanCount > 0">
                  <strong>{{ maintenance.duePlanCount }}</strong> {{ i18n.t('dashboard.due') }}
                </span>
                <span [class.metric-warning]="maintenance.dueSoonPlanCount > 0">
                  <strong>{{ maintenance.dueSoonPlanCount }}</strong> {{ i18n.t('dashboard.dueSoon') }}
                </span>
                <span [class.metric-neutral]="maintenance.unknownMileagePlanCount > 0">
                  <strong>{{ maintenance.unknownMileagePlanCount }}</strong> {{ i18n.t('dashboard.unknownMileage') }}
                </span>
              </div>
              <p class="muted small">{{ maintenance.activePlanCount }} {{ i18n.t('dashboard.activePlans') }}</p>
            }
          </article>

          <article class="dashboard-card stack">
            <div class="dashboard-card-heading">
              <h2>{{ i18n.t('dashboard.expensesTitle') }}</h2>
              <a [routerLink]="featurePath(vehicle.id, 'EXPENSES')">{{ i18n.t('dashboard.view') }}</a>
            </div>
            @if (dashboard.expenses; as expenses) {
              <p class="dashboard-value">{{ money(expenses.recordedTotalCostVnd) }}</p>
              <p class="muted small">
                {{ i18n.t('dashboard.monthlyVehicleTotal') }} · {{ monthLabel(dashboard.month) }}
              </p>
              @if (expenses.incomplete) {
                <p class="dashboard-note">
                  {{ expenses.unknownMaintenanceCostCount }} · {{ i18n.t('dashboard.unknownCosts') }}
                </p>
              }
            }
          </article>

          <article class="dashboard-card stack">
            <div class="dashboard-card-heading">
              <h2>{{ i18n.t('dashboard.fuelTitle') }}</h2>
              <a [routerLink]="featurePath(vehicle.id, 'FUEL_LOG')">{{ i18n.t('dashboard.view') }}</a>
            </div>
            @if (dashboard.fuel; as fuel) {
              <p class="dashboard-value">{{ money(fuel.totalCostVnd) }}</p>
              <p class="muted small">
                {{ fuel.totalQuantityLiters }} L · {{ fuel.refuelCount }} {{ i18n.t('dashboard.refuels') }} ·
                {{ monthLabel(dashboard.month) }}
              </p>
              <p class="dashboard-note">{{ fuelAvailability(fuel.economyAvailability) }}</p>
            }
          </article>

          <article class="dashboard-card stack">
            <div class="dashboard-card-heading">
              <h2>{{ i18n.t('dashboard.monitoringTitle') }}</h2>
              <a [routerLink]="featurePath(vehicle.id, 'MONITORING')">{{ i18n.t('dashboard.view') }}</a>
            </div>
            @if (dashboard.monitoring; as monitoring) {
              <p class="dashboard-status">{{ monitoringStatus(monitoring.effectiveStatus) }}</p>
              @if (monitoring.effectiveStatus === 'ENABLED_BUT_MANUAL') {
                <p class="dashboard-note">{{ i18n.t('monitoring.savedManual') }}</p>
              } @else if (monitoring.effectiveStatus === 'PROVIDER_UNAVAILABLE') {
                <p class="dashboard-note">{{ i18n.t('monitoring.unavailable') }}</p>
              } @else if (monitoring.effectiveStatus === 'DISABLED') {
                <p class="muted small">{{ i18n.t('dashboard.monitoringDisabled') }}</p>
              } @else if (monitoring.lastSuccessfulCheckAt) {
                <p class="muted small">
                  {{ i18n.t('monitoring.lastCheck') }}: {{ dateTime(monitoring.lastSuccessfulCheckAt) }}
                </p>
              }
            } @else {
              <p class="muted small">{{ i18n.t('common.unavailable') }}</p>
            }
          </article>
        </div>

        <div class="dashboard-footer stack">
          <p class="caption">
            {{ i18n.t('dashboard.refreshed') }}: {{ dateTime(dashboard.refreshedAt) }} ·
            {{ i18n.t('dashboard.privateNote') }}
          </p>
          <nav
            class="feature-links"
            [attr.aria-label]="i18n.t('dashboard.featureLinks')"
          >
            <a [routerLink]="featurePath(vehicle.id, 'GARAGE')">{{ i18n.t('dashboard.garageLink') }}</a>
            <a [routerLink]="featurePath(vehicle.id, 'DOCUMENTS')">{{ i18n.t('dashboard.documentsTitle') }}</a>
            <a [routerLink]="featurePath(vehicle.id, 'FUEL_LOG')">{{ i18n.t('dashboard.fuelTitle') }}</a>
            <a [routerLink]="featurePath(vehicle.id, 'MAINTENANCE')">{{ i18n.t('dashboard.maintenanceTitle') }}</a>
            <a [routerLink]="featurePath(vehicle.id, 'EXPENSES')">{{ i18n.t('dashboard.expensesTitle') }}</a>
          </nav>
        </div>
      } @else {
        <div class="dashboard-empty stack">
          <h2>{{ i18n.t('dashboard.emptyTitle') }}</h2>
          <p class="muted">{{ i18n.t('dashboard.emptyText') }}</p>
          <a
            tnButton
            [routerLink]="garagePath(i18n.locale(), undefined, 'add')"
            >{{ i18n.t('garage.addFirst') }}</a
          >
        </div>
      }
    }
  </section>`,
  styles: `
    .dashboard-page {
      max-width: 76rem;
    }
    .dashboard-heading,
    .dashboard-card-heading {
      display: flex;
      justify-content: space-between;
      gap: var(--space-5);
      align-items: flex-start;
    }
    .dashboard-heading-links {
      align-items: center;
      flex-shrink: 0;
    }
    .dashboard-selector-panel,
    .dashboard-card,
    .dashboard-empty,
    .dashboard-feedback {
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface);
    }
    .dashboard-selector-panel {
      display: grid;
      gap: var(--space-2);
      max-width: 32rem;
      padding: var(--space-5);
    }
    .dashboard-selector-panel label {
      font-weight: 700;
    }
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-5);
    }
    .dashboard-card {
      min-width: 0;
      padding: var(--space-6);
    }
    .dashboard-card--vehicle {
      background: var(--surface-subtle);
    }
    .dashboard-card h2 {
      margin: 0;
    }
    .dashboard-card-heading h2 {
      font-size: var(--text-h3);
    }
    .dashboard-facts,
    .dashboard-facts dd {
      margin: 0;
    }
    .dashboard-facts dt {
      color: var(--text-muted);
      font-size: var(--text-caption);
    }
    .dashboard-facts dd {
      font-weight: 700;
    }
    .dashboard-metrics {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-4);
    }
    .dashboard-metrics span {
      color: var(--text-muted);
    }
    .dashboard-metrics strong {
      color: var(--text-primary);
      font-size: 1.25rem;
    }
    .metric-danger strong,
    .dashboard-status {
      color: var(--danger);
    }
    .metric-warning strong {
      color: var(--warning);
    }
    .metric-neutral strong {
      color: var(--text-muted);
    }
    .dashboard-value {
      margin: 0;
      color: var(--brand);
      font-size: clamp(1.25rem, 3vw, 1.8rem);
      font-weight: 800;
      overflow-wrap: anywhere;
    }
    .dashboard-note {
      margin: 0;
      color: var(--text-muted);
      font-size: var(--text-small);
    }
    .dashboard-status {
      margin: 0;
      font-weight: 750;
    }
    .dashboard-footer {
      padding-block-start: var(--space-2);
    }
    .feature-links {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3) var(--space-5);
    }
    .dashboard-empty,
    .dashboard-feedback {
      padding: var(--space-8);
    }
    .dashboard-error {
      border-color: color-mix(in srgb, var(--danger) 45%, var(--border));
    }
    @media (max-width: 48rem) {
      .dashboard-heading {
        display: grid;
      }
      .dashboard-heading-links {
        justify-content: flex-start;
      }
    }
    @media (max-width: 38rem) {
      .dashboard-grid {
        grid-template-columns: minmax(0, 1fr);
      }
      .dashboard-heading-links {
        align-items: flex-start;
        flex-direction: column;
        gap: var(--space-2);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent implements OnInit {
  protected readonly i18n = inject(LocaleService);
  protected readonly garagePath = garagePath;
  protected readonly selectedId = signal('');
  protected readonly data = signal<VehicleDashboardResult | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  private readonly service = inject(DashboardService);
  private readonly auth = inject(AuthService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private requestId = 0;

  ngOnInit(): void {
    if (this.browser) void this.start();
  }

  protected selectVehicle(event: Event): void {
    const vehicleId = (event.target as HTMLSelectElement).value;
    this.selectedId.set(vehicleId);
    void this.load(vehicleId);
  }

  protected retry(): void {
    void this.load(this.selectedId() || undefined);
  }

  protected typeLabel(type: string): string {
    return this.i18n.t(`garage.type.${type}` as Parameters<LocaleService['t']>[0]);
  }

  protected featurePath(vehicleId: string, key: VehicleDashboardFeatureLink['key']): string {
    const locale = this.i18n.locale();
    switch (key) {
      case 'GARAGE':
      case 'MONITORING':
        return garagePath(locale, vehicleId);
      case 'DOCUMENTS':
        return documentPath(locale, vehicleId);
      case 'FUEL_LOG':
        return fuelLogPath(locale, vehicleId);
      case 'MAINTENANCE':
        return maintenancePath(locale, vehicleId);
      case 'EXPENSES':
        return expensePath(locale, vehicleId);
    }
  }

  protected money(value: string): string {
    return formatVnd(BigInt(value), this.i18n.locale());
  }

  protected dateOnly(value: string): string {
    return formatDate(new Date(`${value}T00:00:00+07:00`), this.i18n.locale());
  }

  protected dateTime(value: string): string {
    return formatDateTime(new Date(value), this.i18n.locale());
  }

  protected monthLabel(value: string): string {
    return new Intl.DateTimeFormat(this.i18n.locale() === 'vi' ? 'vi-VN' : 'en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: 'long',
    }).format(new Date(`${value}-01T00:00:00+07:00`));
  }

  protected fuelAvailability(value: string): string {
    const key = `dashboard.fuel.${value}` as Parameters<LocaleService['t']>[0];
    return this.i18n.t(key);
  }

  protected monitoringStatus(value: string): string {
    const key =
      value === 'ENABLED_AND_ACTIVE'
        ? 'monitoring.statusActive'
        : value === 'ENABLED_BUT_MANUAL'
          ? 'monitoring.statusManual'
          : value === 'DISABLED'
            ? 'monitoring.statusDisabled'
            : 'monitoring.statusSuspended';
    return this.i18n.t(key);
  }

  private async start(): Promise<void> {
    await this.auth.ready();
    if (!this.auth.user()) {
      location.assign(
        pagePaths.login[this.i18n.locale()] + '?returnTo=' + encodeURIComponent(dashboardPath(this.i18n.locale())),
      );
      return;
    }
    await this.load();
  }

  private async load(vehicleId?: string): Promise<void> {
    const requestId = ++this.requestId;
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.service.get(vehicleId);
      if (requestId !== this.requestId) return;
      this.data.set(result);
      this.selectedId.set(result.selectedVehicle?.id ?? '');
    } catch (error) {
      if (requestId === this.requestId) this.error.set(this.auth.message(error));
    } finally {
      if (requestId === this.requestId) this.loading.set(false);
    }
  }
}
