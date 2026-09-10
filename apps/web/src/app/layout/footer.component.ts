import { LocaleService } from '../i18n/locale.service';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'tn-footer',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="container">
      <div class="footer-main">
        <div class="stack">
          <a
            class="footer-brand"
            [routerLink]="i18n.path('home')"
            >TraNhanh<span> / </span></a
          >
          <p class="muted small">{{ i18n.t('home.tagline') }}</p>
          <p class="caption">{{ i18n.t('footer.description') }}</p>
        </div>
        <div class="footer-groups">
          <div class="stack">
            <h2>{{ i18n.t('common.explore') }}</h2>
            <span>{{ i18n.t('footer.lookup') }}</span>
            <span>{{ i18n.t('footer.tools') }}</span>
            <span>{{ i18n.t('footer.today') }}</span>
          </div>
          <div class="stack">
            <h2>{{ i18n.t('footer.about') }}</h2>
            <span>{{ i18n.t('footer.introduction') }}</span>
            <span>{{ i18n.t('footer.sources') }}</span>
            <a [routerLink]="i18n.path('showcase')">{{ i18n.t('navigation.showcase') }}</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom caption">
        <span>{{ i18n.t('footer.status') }}</span>
        <span>{{ i18n.t('footer.legal') }}</span>
      </div>
    </footer>
  `,
  styles: `
    :host {
      display: block;
      border-top: 1px solid var(--border);
      background: var(--surface);
    }
    .footer-main {
      display: grid;
      gap: var(--space-10);
      padding-block: var(--space-10);
    }
    .footer-brand {
      font-size: 1.5rem;
      font-weight: 750;
      text-decoration: none;
      color: var(--text-primary);
    }
    .footer-brand span {
      color: var(--brand);
    }
    h2 {
      font-size: var(--text-small);
    }
    .footer-groups {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-6);
    }
    .footer-groups span {
      font-size: var(--text-caption);
      color: var(--text-muted);
    }
    .footer-groups a {
      font-size: var(--text-caption);
      min-height: 44px;
      display: inline-flex;
      align-items: center;
    }
    .footer-bottom {
      border-top: 1px solid var(--border);
      padding-block: var(--space-6);
    }
    .footer-bottom {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: var(--space-3);
    }
    @media (min-width: 48rem) {
      .footer-main {
        grid-template-columns: 1fr 1fr;
      }
    }
  `,
})
export class FooterComponent {
  protected readonly i18n = inject(LocaleService);
}
