import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { VehicleResult } from '@tranhanh/shared';
import { AuthService } from '../auth/auth.service';
import { ButtonDirective } from '../design-system/button.directive';
import { LocaleService } from '../i18n/locale.service';
import { garagePath, pagePaths } from '../i18n/routes';
import { GarageService } from './garage.service';
import { VehicleMonitoringComponent } from './vehicle-monitoring.component';
import { VehicleDocumentSummaryComponent } from './vehicle-document-summary.component';
@Component({
  selector: 'tn-vehicle-detail-page',
  imports: [RouterLink, ButtonDirective, VehicleMonitoringComponent, VehicleDocumentSummaryComponent],
  template: `<section class="container section stack garage-detail">
    <a
      class="back-link"
      [routerLink]="garagePath(i18n.locale())"
      >← {{ i18n.t('garage.back') }}</a
    >
    @if (loading()) {
      <p
        class="muted"
        role="status"
      >
        {{ i18n.t('common.loading') }}
      </p>
    } @else if (error()) {
      <p
        class="form-error"
        role="alert"
      >
        {{ error() }}
      </p>
    } @else if (vehicle(); as v) {
      <div class="garage-heading">
        <div>
          <div class="cluster">
            <h1>{{ v.displayName }}</h1>
            @if (v.isPrimary) {
              <span
                class="badge"
                data-tone="success"
                >{{ i18n.t('garage.primary') }}</span
              >
            }
            @if (v.status === 'ARCHIVED') {
              <span class="badge">{{ i18n.t('garage.archived') }}</span>
            }
          </div>
          <strong class="plate plate--large">{{ v.licensePlate }}</strong>
        </div>
        <a
          tnButton
          variant="secondary"
          [routerLink]="garagePath(i18n.locale(), v.id, 'edit')"
          >{{ i18n.t('garage.edit') }}</a
        >
      </div>
      <dl class="vehicle-facts">
        <div>
          <dt>{{ i18n.t('garage.type') }}</dt>
          <dd>{{ typeLabel(v.vehicleType) }}</dd>
        </div>
        <div>
          <dt>{{ i18n.t('garage.make') }}</dt>
          <dd>{{ v.make || '—' }}</dd>
        </div>
        <div>
          <dt>{{ i18n.t('garage.model') }}</dt>
          <dd>{{ v.model || '—' }}</dd>
        </div>
        <div>
          <dt>{{ i18n.t('garage.year') }}</dt>
          <dd>{{ v.modelYear || '—' }}</dd>
        </div>
        <div>
          <dt>{{ i18n.t('garage.odometer') }}</dt>
          <dd>{{ v.currentOdometerKm == null ? '—' : v.currentOdometerKm.toLocaleString() + ' km' }}</dd>
        </div>
        <div>
          <dt>{{ i18n.t('garage.notes') }}</dt>
          <dd>{{ v.notes || '—' }}</dd>
        </div>
      </dl>
      <tn-vehicle-document-summary [vehicleId]="v.id" />
      <tn-vehicle-monitoring
        [vehicleId]="v.id"
        [vehicleStatus]="v.status"
      />
      <div class="cluster">
        @if (v.status === 'ACTIVE' && !v.isPrimary) {
          <button
            tnButton
            variant="secondary"
            type="button"
            [loading]="busy()"
            (click)="primary()"
          >
            {{ i18n.t('garage.makePrimary') }}
          </button>
        }
        @if (v.status === 'ACTIVE') {
          <button
            tnButton
            variant="ghost"
            type="button"
            (click)="confirming.set(true)"
          >
            {{ i18n.t('garage.archive') }}
          </button>
        } @else {
          <button
            tnButton
            variant="secondary"
            type="button"
            [loading]="busy()"
            (click)="restore()"
          >
            {{ i18n.t('garage.restore') }}
          </button>
        }
      </div>
      @if (confirming()) {
        <div
          class="confirm-box"
          role="alertdialog"
          aria-modal="true"
        >
          <p>{{ i18n.t('garage.archiveConfirm') }}</p>
          <div class="cluster">
            <button
              tnButton
              variant="danger"
              type="button"
              [loading]="busy()"
              (click)="archive()"
            >
              {{ i18n.t('garage.archive') }}</button
            ><button
              tnButton
              variant="ghost"
              type="button"
              (click)="confirming.set(false)"
            >
              {{ i18n.t('garage.cancel') }}
            </button>
          </div>
        </div>
      }
    }
  </section>`,
  styleUrl: './garage.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleDetailPageComponent implements OnInit {
  protected readonly i18n = inject(LocaleService);
  protected readonly garagePath = garagePath;
  private readonly garage = inject(GarageService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id')!;
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly vehicle = signal<VehicleResult | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly confirming = signal(false);
  ngOnInit(): void {
    if (this.browser) void this.start();
  }
  private async start() {
    await this.auth.ready();
    if (!this.auth.user()) {
      location.assign(pagePaths.login[this.i18n.locale()] + '?returnTo=' + encodeURIComponent(this.router.url));
      return;
    }
    await this.load();
  }
  protected typeLabel(type: string): string {
    return this.i18n.t(`garage.type.${type}` as Parameters<LocaleService['t']>[0]);
  }
  protected async primary() {
    await this.act(() => this.garage.setPrimary(this.id));
  }
  protected async archive() {
    await this.act(() => this.garage.archive(this.id));
    this.confirming.set(false);
  }
  protected async restore() {
    await this.act(() => this.garage.restore(this.id));
  }
  private async act(run: () => Promise<VehicleResult>) {
    this.busy.set(true);
    this.error.set('');
    try {
      this.vehicle.set(await run());
    } catch (e) {
      this.error.set(this.auth.message(e));
    } finally {
      this.busy.set(false);
    }
  }
  private async load() {
    try {
      this.vehicle.set(await this.garage.get(this.id));
    } catch (e) {
      this.error.set(this.auth.message(e));
    } finally {
      this.loading.set(false);
    }
  }
}
