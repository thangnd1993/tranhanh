import { LocaleService } from '../i18n/locale.service';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonDirective } from '../design-system/button.directive';
import { CardComponent } from '../design-system/card.component';
import { IconComponent } from '../design-system/icon.component';

@Component({
  selector: 'tn-home',
  imports: [RouterLink, ButtonDirective, CardComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="container section home-intro">
      <p class="eyebrow">{{ i18n.t('home.eyebrow') }}</p>
      <h1 class="display">{{ i18n.t('home.tagline') }}</h1>
      <p class="muted">{{ i18n.t('home.intro') }}</p>
      <a
        tnButton
        [routerLink]="i18n.path('showcase')"
        size="large"
      >
        {{ i18n.t('home.explore') }} <tn-icon name="arrow" />
      </a>
      <p class="caption">{{ i18n.t('home.notice') }}</p>
    </section>
    <section
      [attr.aria-label]="i18n.t('home.categories')"
      class="container section grid grid--three"
    >
      @for (category of categories; track category.title) {
        <tn-card>
          <div class="stack">
            <tn-icon [name]="category.icon" />
            <h2>{{ category.title }}</h2>
            <p class="muted small">{{ category.description }}</p>
            <span class="caption">{{ i18n.t('common.developing') }}</span>
          </div>
        </tn-card>
      }
    </section>
  `,
  styles: `
    .home-intro {
      max-width: 45rem;
      text-align: center;
      display: grid;
      justify-items: center;
      gap: var(--space-6);
    }
    h1 {
      margin-block: var(--space-2);
    }
    h2 {
      font-size: var(--text-card);
    }
    tn-icon {
      color: var(--brand);
    }
    a tn-icon {
      color: inherit;
    }
  `,
})
export class HomeComponent {
  protected readonly i18n = inject(LocaleService);
  protected get categories() {
    return [
      { title: this.i18n.t('navigation.lookup'), description: this.i18n.t('home.lookupDescription'), icon: 'search' },
      { title: this.i18n.t('navigation.tools'), description: this.i18n.t('home.toolsDescription'), icon: 'tool' },
      { title: this.i18n.t('navigation.today'), description: this.i18n.t('home.todayDescription'), icon: 'sun' },
    ] as const;
  }
}
