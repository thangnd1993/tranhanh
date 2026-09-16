import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { VehicleResult } from '@tranhanh/shared';
import { ButtonDirective } from '../design-system/button.directive';
import { LocaleService } from '../i18n/locale.service';
import { garagePath, pagePaths } from '../i18n/routes';
import { AuthService } from '../auth/auth.service';
import { GarageService } from './garage.service';

@Component({
  selector: 'tn-garage-page',
  imports: [RouterLink, ButtonDirective],
  template: `<section class="container section stack garage-page">
    <div class="garage-heading">
      <div>
        <p class="eyebrow">{{ i18n.t('garage.private') }}</p>
        <h1>{{ i18n.t('garage.title') }}</h1>
        <p class="muted">{{ i18n.t('garage.intro') }}</p>
      </div>
      <a
        tnButton
        [routerLink]="garagePath(i18n.locale(), undefined, 'add')"
        >{{ i18n.t('garage.add') }}</a
      >
    </div>
    <label class="archive-toggle"
      ><input
        type="checkbox"
        [checked]="includeArchived()"
        (change)="toggleArchived($event)"
      />
      {{ i18n.t('garage.showArchived') }}</label
    >
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
    } @else if (!vehicles().length) {
      <div class="garage-empty stack">
        <h2>{{ i18n.t('garage.emptyTitle') }}</h2>
        <p class="muted">{{ i18n.t('garage.emptyText') }}</p>
        <a
          tnButton
          [routerLink]="garagePath(i18n.locale(), undefined, 'add')"
          >{{ i18n.t('garage.addFirst') }}</a
        >
      </div>
    } @else {
      <div class="garage-grid">
        @for (vehicle of vehicles(); track vehicle.id) {
          <a
            class="vehicle-card"
            [routerLink]="garagePath(i18n.locale(), vehicle.id)"
          >
            <div class="cluster">
              <h2>{{ vehicle.displayName }}</h2>
              @if (vehicle.isPrimary) {
                <span
                  class="badge"
                  data-tone="success"
                  >{{ i18n.t('garage.primary') }}</span
                >
              }
              @if (vehicle.status === 'ARCHIVED') {
                <span class="badge">{{ i18n.t('garage.archived') }}</span>
              }
            </div>
            <strong class="plate">{{ vehicle.licensePlate }}</strong>
            <p class="muted small">
              {{ typeLabel(vehicle.vehicleType) }}
              @if (vehicle.modelYear) {
                · {{ vehicle.modelYear }}
              }
            </p>
          </a>
        }
      </div>
    }
  </section>`,
  styleUrl: './garage.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GaragePageComponent implements OnInit {
  protected readonly i18n = inject(LocaleService);
  protected readonly garagePath = garagePath;
  private readonly garage = inject(GarageService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly vehicles = signal<VehicleResult[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly includeArchived = signal(false);
  ngOnInit(): void {
    if (this.browser) void this.start();
  }
  private async start(): Promise<void> {
    await this.auth.ready();
    if (!this.auth.user()) {
      location.assign(
        pagePaths.login[this.i18n.locale()] + '?returnTo=' + encodeURIComponent(garagePath(this.i18n.locale())),
      );
      return;
    }
    await this.load();
  }
  protected async toggleArchived(event: Event): Promise<void> {
    this.includeArchived.set((event.target as HTMLInputElement).checked);
    await this.load();
  }
  protected typeLabel(type: string): string {
    return this.i18n.t(`garage.type.${type}` as Parameters<LocaleService['t']>[0]);
  }
  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.vehicles.set(await this.garage.list(this.includeArchived() ? 'ALL' : 'ACTIVE'));
    } catch (error) {
      this.error.set(this.auth.message(error));
    } finally {
      this.loading.set(false);
    }
  }
}
