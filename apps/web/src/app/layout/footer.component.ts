import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../i18n/locale.service';
import { areaPath, phonePath, vehiclePath } from '../i18n/routes';

@Component({
  selector: 'tn-footer',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="container">
      <div class="footer-main">
        <div class="stack footer-intro">
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
            <h2>{{ i18n.t('footer.vehicleGroup') }}</h2>
            <a [routerLink]="vehiclePath(i18n.locale())">{{ i18n.t('footer.vehicleLookup') }}</a>
            <span>{{ i18n.t('footer.trafficFine') }}</span>
          </div>
          <div class="stack">
            <h2>{{ i18n.t('footer.driverGroup') }}</h2>
            <span>{{ i18n.t('footer.fuelPrices') }}</span>
            <a [routerLink]="phonePath(i18n.locale())">{{ i18n.t('footer.phoneLookup') }}</a>
            <a [routerLink]="areaPath(i18n.locale())">{{ i18n.t('footer.areaLookup') }}</a>
          </div>
          <div class="stack">
            <h2>{{ i18n.t('footer.informationGroup') }}</h2>
            <span>{{ i18n.t('footer.sources') }}</span>
            <span>{{ i18n.t('footer.privacy') }}</span>
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
    .footer-intro {
      max-width: 27rem;
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
      gap: var(--space-8);
    }
    .footer-groups span,
    .footer-groups a {
      font-size: var(--text-caption);
    }
    .footer-groups span {
      color: var(--text-muted);
    }
    .footer-groups a {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
    }
    .footer-bottom {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: var(--space-3);
      border-top: 1px solid var(--border);
      padding-block: var(--space-6);
    }
    @media (min-width: 40rem) {
      .footer-groups {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
    @media (min-width: 64rem) {
      .footer-main {
        grid-template-columns: minmax(18rem, 0.75fr) minmax(0, 1.25fr);
      }
    }
  `,
})
export class FooterComponent {
  protected readonly vehiclePath = vehiclePath;
  protected readonly phonePath = phonePath;
  protected readonly areaPath = areaPath;
  protected readonly i18n = inject(LocaleService);
}
