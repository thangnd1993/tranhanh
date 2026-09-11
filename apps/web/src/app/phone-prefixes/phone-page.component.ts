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
import { phonePath } from '../i18n/routes';
import { PhoneApi } from './phone-api.service';
import { phoneCopy, phoneHeading } from './phone-copy';
import { PhoneError } from './phone-data';
import { PhonePageData } from './phone.resolver';
import { PhoneResultComponent } from './phone-result.component';
@Component({
  selector: 'tn-phone-page',
  imports: [
    RouterLink,
    BreadcrumbComponent,
    ButtonDirective,
    CardComponent,
    ControlDirective,
    FieldComponent,
    PhoneResultComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './phone-page.component.html',
  styleUrl: './phone-page.component.scss',
})
export class PhonePageComponent {
  readonly i18n = inject(LocaleService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(PhoneApi);
  readonly data = toSignal(this.route.data.pipe(map((data) => data['phone'] as PhonePageData)), {
    initialValue: this.route.snapshot.data['phone'] as PhonePageData,
  });
  readonly copy = computed(() => phoneCopy(this.i18n.locale()));
  readonly heading = computed(() => {
    const d = this.data();
    return d.status === 404
      ? this.copy().missing
      : d.status === 503
        ? this.copy().unavailable
        : d.row
          ? phoneHeading(d.row, this.i18n.locale())
          : this.copy().index;
  });
  readonly pending = signal(false);
  readonly error = signal<'invalid' | 'missingBody' | 'unavailableBody' | null>(null);
  readonly operator = signal('');
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
    const keys = [...new Set(rows.map((r) => r.operator.key))];
    return keys.map((key) => ({
      key,
      name: rows.find((r) => r.operator.key === key)!.operator.name,
      rows: rows.filter((r) => r.operator.key === key),
    }));
  });
  readonly legacy = computed(() =>
    this.data().items.filter((r) => r.status === 'LEGACY' && (!this.operator() || r.operator.key === this.operator())),
  );
  path(prefix?: string) {
    return phonePath(this.i18n.locale(), prefix);
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
    if (!value || value.length > 32) {
      this.error.set('invalid');
      return;
    }
    this.pending.set(true);
    try {
      const row = await this.api.lookup(value);
      await this.router.navigateByUrl(this.path(row.prefix));
    } catch (error) {
      this.error.set(
        error instanceof PhoneError && error.status === 400
          ? 'invalid'
          : error instanceof PhoneError && error.status === 404
            ? 'missingBody'
            : 'unavailableBody',
      );
    } finally {
      this.pending.set(false);
    }
  }
}
