import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonDirective } from '../design-system/button.directive';
import { LocaleService } from '../i18n/locale.service';

@Component({
  selector: 'tn-not-found',
  imports: [RouterLink, ButtonDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="container section stack">
      <p class="eyebrow">404</p>
      <h1>{{ i18n.t('seo.notFound.title') }}</h1>
      <p class="muted">{{ i18n.t('seo.notFound.description') }}</p>
      <a
        tnButton
        [routerLink]="i18n.path('home')"
        >{{ i18n.t('notFound.home') }}</a
      >
    </section>
  `,
  styles: `
    section {
      max-width: 45rem;
      padding-block: var(--space-16);
    }
    a {
      align-self: flex-start;
    }
  `,
})
export class NotFoundComponent {
  protected readonly i18n = inject(LocaleService);
}
