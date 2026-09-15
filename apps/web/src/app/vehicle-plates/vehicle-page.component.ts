import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterLink,
} from '@angular/router';
import { map } from 'rxjs';
import { BreadcrumbComponent } from '../design-system/breadcrumb.component';
import { ButtonDirective } from '../design-system/button.directive';
import { CardComponent } from '../design-system/card.component';
import { ControlDirective, FieldComponent } from '../design-system/field.component';
import { LocaleService } from '../i18n/locale.service';
import { vehiclePath } from '../i18n/routes';
import { VehicleApi } from './vehicle-api.service';
import { vehicleCopy, vehicleHeading } from './vehicle-copy';
import { VehicleRow, VehicleError } from './vehicle-data';
import { VehiclePageData } from './vehicle.resolver';
import { VehicleResultComponent } from './vehicle-result.component';
@Component({
  selector: 'tn-vehicle-page',
  imports: [
    RouterLink,
    BreadcrumbComponent,
    ButtonDirective,
    CardComponent,
    ControlDirective,
    FieldComponent,
    VehicleResultComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vehicle-page.component.html',
  styleUrl: './vehicle-page.component.scss',
})
export class VehiclePageComponent {
  readonly i18n = inject(LocaleService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(VehicleApi);
  readonly data = toSignal(this.route.data.pipe(map((data) => data['vehicle'] as VehiclePageData)), {
    initialValue: this.route.snapshot.data['vehicle'] as VehiclePageData,
  });
  readonly copy = computed(() => vehicleCopy(this.i18n.locale()));
  readonly heading = computed(() => {
    const d = this.data();
    return d.status === 404
      ? this.copy().missing
      : d.status === 503
        ? this.copy().unavailable
        : d.result
          ? vehicleHeading(d.prefix!, this.i18n.locale())
          : this.copy().index;
  });
  readonly pending = signal(false);
  readonly error = signal<'invalid' | 'missingBody' | 'unavailableBody' | null>(null);
  readonly results = signal<VehicleRow[]>([]);
  readonly navigation = toSignal(
    this.router.events.pipe(
      map((event) =>
        event instanceof NavigationStart
          ? true
          : event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError
            ? false
            : this.router.currentNavigation() !== null,
      ),
    ),
    { initialValue: false },
  );
  readonly groups = computed(() => {
    const rows = this.data().items.filter((r) => r.status === 'ACTIVE');
    return [...new Set(rows.map((r) => r.target.key))].map((key) => ({
      key,
      name: rows.find((r) => r.target.key === key)!.target.name,
      rows: rows.filter((r) => r.target.key === key),
    }));
  });
  path(code?: string) {
    return vehiclePath(this.i18n.locale(), code);
  }
  retryPath() {
    return this.path(this.route.snapshot.paramMap.get('prefix') ?? undefined);
  }
  async search(event: Event, input: HTMLInputElement) {
    event.preventDefault();
    if (this.pending()) return;
    const value = input.value.trim();
    input.value = '';
    this.error.set(null);
    this.results.set([]);
    if (!value || value.length > 100) {
      this.error.set('invalid');
      return;
    }
    this.pending.set(true);
    try {
      if (/^\d/.test(value)) {
        const row = await this.api.lookup(value);
        await this.router.navigateByUrl(this.path(row.parsed.numericPrefix + (row.parsed.series ?? '')));
      } else {
        const page = await this.api.search(value);
        const rows = page.items.filter((r) => r.status === 'ACTIVE');
        if (!rows.length) this.error.set('missingBody');
        else {
          const normalized = (text: string) =>
            text
              .normalize('NFD')
              .replace(/\p{M}/gu, '')
              .replace(/[đĐ]/g, 'd')
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, ' ')
              .trim();
          const key = normalized(value);
          const exact = rows.filter((row) =>
            [row.target.name, ...row.target.aliases].some((name) => normalized(name) === key),
          );
          this.results.set(exact.length ? exact : rows);
        }
      }
    } catch (error) {
      this.error.set(
        error instanceof VehicleError && error.status === 400
          ? 'invalid'
          : error instanceof VehicleError && error.status === 404
            ? 'missingBody'
            : 'unavailableBody',
      );
    } finally {
      this.pending.set(false);
    }
  }
}
