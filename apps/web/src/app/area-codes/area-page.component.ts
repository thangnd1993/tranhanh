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
import { areaPath } from '../i18n/routes';
import { AreaApi } from './area-api.service';
import { areaCopy, areaHeading } from './area-copy';
import { AreaCodeResult, AreaError } from './area-data';
import { AreaPageData } from './area.resolver';
import { AreaResultComponent } from './area-result.component';
@Component({
  selector: 'tn-area-page',
  imports: [
    RouterLink,
    BreadcrumbComponent,
    ButtonDirective,
    CardComponent,
    ControlDirective,
    FieldComponent,
    AreaResultComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './area-page.component.html',
  styleUrl: './area-page.component.scss',
})
export class AreaPageComponent {
  readonly i18n = inject(LocaleService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AreaApi);
  readonly data = toSignal(this.route.data.pipe(map((data) => data['area'] as AreaPageData)), {
    initialValue: this.route.snapshot.data['area'] as AreaPageData,
  });
  readonly copy = computed(() => areaCopy(this.i18n.locale()));
  readonly heading = computed(() => {
    const d = this.data();
    return d.status === 404
      ? this.copy().missing
      : d.status === 503
        ? this.copy().unavailable
        : d.row
          ? areaHeading(d.row, this.i18n.locale())
          : this.copy().index;
  });
  readonly pending = signal(false);
  readonly error = signal<'invalid' | 'missingBody' | 'unavailableBody' | null>(null);
  readonly results = signal<AreaCodeResult[]>([]);
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
    return [...new Set(rows.map((r) => r.locality.group.key))].map((key) => ({
      key,
      name: rows.find((r) => r.locality.group.key === key)!.locality.group.name,
      rows: rows.filter((r) => r.locality.group.key === key),
    }));
  });
  readonly legacy = computed(() => this.data().items.filter((r) => r.status === 'LEGACY'));
  path(code?: string) {
    return areaPath(this.i18n.locale(), code);
  }
  retryPath() {
    return this.path(this.route.snapshot.paramMap.get('code') ?? undefined);
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
      if (/^[+\d\s-]+$/.test(value)) {
        const row = await this.api.lookup(value);
        await this.router.navigateByUrl(this.path(row.code));
      } else {
        const page = await this.api.search(value);
        const rows = page.items.filter((r) => ['ACTIVE', 'LEGACY'].includes(r.status));
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
            [row.locality.name, ...row.locality.aliases].some((name) => normalized(name) === key),
          );
          this.results.set(exact.length ? exact : rows);
        }
      }
    } catch (error) {
      this.error.set(
        error instanceof AreaError && error.status === 400
          ? 'invalid'
          : error instanceof AreaError && error.status === 404
            ? 'missingBody'
            : 'unavailableBody',
      );
    } finally {
      this.pending.set(false);
    }
  }
}
