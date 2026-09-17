import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import type { VehicleMonitoringHistoryResult, VehicleMonitoringResult, VehicleStatus } from '@tranhanh/shared';
import { ButtonDirective } from '../design-system/button.directive';
import { formatDateTime } from '../i18n/format';
import { LocaleService } from '../i18n/locale.service';
import { GarageService } from './garage.service';

@Component({
  selector: 'tn-vehicle-monitoring',
  imports: [ButtonDirective],
  template: `<section
    class="monitoring-panel stack"
    aria-labelledby="monitoring-title"
  >
    <div class="monitoring-heading">
      <div>
        <p class="eyebrow">{{ i18n.t('monitoring.eyebrow') }}</p>
        <h2 id="monitoring-title">{{ i18n.t('monitoring.title') }}</h2>
      </div>
      @if (monitoring(); as state) {
        <span
          class="badge"
          [attr.data-tone]="
            state.effectiveStatus === 'ENABLED_AND_ACTIVE' ? 'success' : state.enabled ? 'warning' : null
          "
        >
          {{ statusLabel(state) }}
        </span>
      }
    </div>
    @if (loading()) {
      <p
        role="status"
        class="muted"
      >
        {{ i18n.t('common.loading') }}
      </p>
    } @else if (error()) {
      <p
        role="alert"
        class="form-error"
      >
        {{ error() }}
      </p>
    } @else if (monitoring(); as state) {
      <p
        id="monitoring-explanation"
        class="muted"
      >
        {{ explanation(state) }}
      </p>
      <dl class="monitoring-facts">
        <div>
          <dt>{{ i18n.t('monitoring.provider') }}</dt>
          <dd>
            <a
              [href]="state.providerUrl"
              rel="noopener noreferrer"
              >{{ state.providerName }}</a
            >
          </dd>
        </div>
        <div>
          <dt>{{ i18n.t('monitoring.lastCheck') }}</dt>
          <dd>{{ state.lastSuccessfulCheckAt ? date(state.lastSuccessfulCheckAt) : '—' }}</dd>
        </div>
        @if (state.nextEligibleCheckAt) {
          <div>
            <dt>{{ i18n.t('monitoring.nextCheck') }}</dt>
            <dd>{{ date(state.nextEligibleCheckAt) }}</dd>
          </div>
        }
      </dl>
      <div class="cluster">
        <button
          tnButton
          type="button"
          [variant]="state.enabled ? 'secondary' : 'primary'"
          [attr.aria-pressed]="state.enabled"
          aria-describedby="monitoring-explanation"
          [disabled]="vehicleStatus() === 'ARCHIVED' && !state.enabled"
          [loading]="busy()"
          (click)="toggle(state)"
        >
          {{ i18n.t(state.enabled ? 'monitoring.disable' : 'monitoring.enable') }}
        </button>
        <a
          tnButton
          variant="ghost"
          [href]="state.providerUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ i18n.t('monitoring.manualCheck') }}
        </a>
      </div>
      @if (notice()) {
        <p
          class="monitoring-notice"
          role="status"
          aria-live="polite"
        >
          {{ notice() }}
        </p>
      }
      <div class="history stack">
        <h3>{{ i18n.t('monitoring.history') }}</h3>
        @if (!history().items.length) {
          <p class="muted">{{ i18n.t('monitoring.emptyHistory') }}</p>
        } @else {
          <ol class="history-list">
            @for (run of history().items; track run.id) {
              <li>
                <strong>{{ outcomeLabel(run.outcome) }}</strong>
                <span
                  >{{ date(run.finishedAt) }} · {{ run.normalizedResultCount }} {{ i18n.t('monitoring.results') }}</span
                >
              </li>
            }
          </ol>
        }
      </div>
    }
  </section>`,
  styleUrl: './garage.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleMonitoringComponent implements OnInit {
  readonly vehicleId = input.required<string>();
  readonly vehicleStatus = input.required<VehicleStatus>();
  protected readonly i18n = inject(LocaleService);
  private readonly garage = inject(GarageService);
  protected readonly monitoring = signal<VehicleMonitoringResult | null>(null);
  protected readonly history = signal<VehicleMonitoringHistoryResult>({ items: [] });
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  ngOnInit(): void {
    void this.load();
  }
  protected async toggle(state: VehicleMonitoringResult): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const next = state.enabled
        ? await this.garage.disableMonitoring(this.vehicleId())
        : await this.garage.enableMonitoring(this.vehicleId());
      this.monitoring.set(next);
      this.notice.set(
        this.i18n.t(
          next.enabled && !next.automaticChecksAvailable
            ? 'monitoring.savedManual'
            : next.enabled
              ? 'monitoring.enabled'
              : 'monitoring.disabled',
        ),
      );
    } catch (error) {
      this.error.set(this.garage.message(error));
    } finally {
      this.busy.set(false);
    }
  }
  protected date(value: string): string {
    return formatDateTime(new Date(value), this.i18n.locale());
  }
  protected statusLabel(state: VehicleMonitoringResult): string {
    if (!state.enabled) return this.i18n.t('monitoring.statusDisabled');
    if (state.effectiveStatus === 'ENABLED_AND_ACTIVE') return this.i18n.t('monitoring.statusActive');
    if (state.effectiveStatus === 'ENABLED_BUT_MANUAL') return this.i18n.t('monitoring.statusManual');
    return this.i18n.t('monitoring.statusSuspended');
  }
  protected explanation(state: VehicleMonitoringResult): string {
    if (this.vehicleStatus() === 'ARCHIVED') return this.i18n.t('monitoring.archived');
    if (state.capability === 'MANUAL_ONLY') return this.i18n.t('monitoring.captcha');
    if (state.effectiveStatus === 'PROVIDER_UNAVAILABLE') return this.i18n.t('monitoring.unavailable');
    return state.enabled ? this.i18n.t('monitoring.activeExplanation') : this.i18n.t('monitoring.intro');
  }
  protected outcomeLabel(outcome: string): string {
    return this.i18n.t(
      outcome === 'CHANGED'
        ? 'monitoring.outcomeChanged'
        : outcome === 'FAILED'
          ? 'monitoring.outcomeFailed'
          : 'monitoring.outcomeChecked',
    );
  }
  private async load(): Promise<void> {
    try {
      const [monitoring, history] = await Promise.all([
        this.garage.monitoring(this.vehicleId()),
        this.garage.monitoringHistory(this.vehicleId()),
      ]);
      this.monitoring.set(monitoring);
      this.history.set(history);
    } catch (error) {
      this.error.set(this.garage.message(error));
    } finally {
      this.loading.set(false);
    }
  }
}
