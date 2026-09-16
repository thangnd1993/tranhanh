import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonDirective } from '../design-system/button.directive';
import { IconComponent } from '../design-system/icon.component';
import type { IconName } from '../design-system/icon.component';
import { LocaleService } from '../i18n/locale.service';
import { areaPath, phonePath, trafficFinePath, vehiclePath } from '../i18n/routes';
import type { TranslationKey } from '../i18n/vi';

@Component({
  selector: 'tn-home',
  imports: [RouterLink, ButtonDirective, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">{{ i18n.t('home.eyebrow') }}</p>
          <h1 class="display">{{ i18n.t('home.tagline') }}</h1>
          <p class="hero-intro">{{ i18n.t('home.intro') }}</p>
          <div class="hero-actions">
            <a
              tnButton
              [routerLink]="trafficFinePath(i18n.locale())"
              size="large"
            >
              {{ i18n.t('home.primaryCta') }} <tn-icon name="arrow" />
            </a>
            <span class="caption">{{ i18n.t('home.heroNote') }}</span>
          </div>
        </div>
        <div
          class="vehicle-visual"
          aria-hidden="true"
        >
          <div class="road-line"></div>
          <div class="vehicle-card">
            <span class="vehicle-icon"><tn-icon name="car" /></span>
            <span class="vehicle-card-label">{{ i18n.t('home.vehicleCardLabel') }}</span>
            <strong>{{ i18n.t('home.vehicleCardValue') }}</strong>
            <span class="source-line"><tn-icon name="shield" /> {{ i18n.t('home.vehicleCardSource') }}</span>
          </div>
          <span class="orbit orbit-one"><tn-icon name="bell" /></span>
          <span class="orbit orbit-two"><tn-icon name="tool" /></span>
        </div>
      </div>
    </section>

    <section class="container section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">{{ i18n.t('home.publicToolsEyebrow') }}</p>
          <h2>{{ i18n.t('home.publicToolsTitle') }}</h2>
        </div>
        <p class="muted">{{ i18n.t('home.publicToolsIntro') }}</p>
      </div>
      <div class="stack">
        <a
          class="feature-card"
          [routerLink]="trafficFinePath(i18n.locale())"
        >
          <span class="feature-icon"><tn-icon name="shield" /></span>
          <span class="feature-copy">
            <span class="feature-label">{{ i18n.t('home.availableNow') }}</span>
            <strong>{{ i18n.t('home.trafficFineTitle') }}</strong>
            <span>{{ i18n.t('home.trafficFineDescription') }}</span>
          </span>
          <tn-icon name="arrow" />
        </a>
        <a
          class="feature-card"
          [routerLink]="vehiclePath(i18n.locale())"
        >
          <span class="feature-icon"><tn-icon name="car" /></span>
          <span class="feature-copy">
            <span class="feature-label">{{ i18n.t('home.availableNow') }}</span>
            <strong>{{ i18n.t('home.vehicleLookupTitle') }}</strong>
            <span>{{ i18n.t('home.vehicleLookupDescription') }}</span>
          </span>
          <tn-icon name="arrow" />
        </a>
      </div>
    </section>

    <section class="future-section">
      <div class="container section">
        <div class="section-heading">
          <div>
            <p class="eyebrow">{{ i18n.t('home.futureEyebrow') }}</p>
            <h2>{{ i18n.t('home.futureTitle') }}</h2>
          </div>
          <p class="muted">{{ i18n.t('home.futureIntro') }}</p>
        </div>
        <div class="future-grid">
          @for (item of futureItems; track item.title) {
            <article class="future-item">
              <span class="future-icon"><tn-icon [name]="item.icon" /></span>
              <div>
                <h3>{{ i18n.t(item.title) }}</h3>
                <p class="small muted">{{ i18n.t(item.description) }}</p>
              </div>
              <span class="badge">{{ i18n.t('common.soon') }}</span>
            </article>
          }
        </div>
      </div>
    </section>

    <section class="container section">
      <div class="section-heading compact-heading">
        <div>
          <p class="eyebrow">{{ i18n.t('home.whyEyebrow') }}</p>
          <h2>{{ i18n.t('home.whyTitle') }}</h2>
        </div>
      </div>
      <div class="value-grid">
        @for (item of valueItems; track item.title) {
          <article class="value-item">
            <tn-icon [name]="item.icon" />
            <h3>{{ i18n.t(item.title) }}</h3>
            <p class="small muted">{{ i18n.t(item.description) }}</p>
          </article>
        }
      </div>
    </section>

    <section class="container other-tools">
      <div>
        <p class="eyebrow">{{ i18n.t('home.otherToolsEyebrow') }}</p>
        <h2>{{ i18n.t('home.otherToolsTitle') }}</h2>
        <p class="muted small">{{ i18n.t('home.otherToolsIntro') }}</p>
      </div>
      <div class="other-links">
        <a [routerLink]="phonePath(i18n.locale())">{{ i18n.t('home.phoneLookup') }}</a>
        <a [routerLink]="areaPath(i18n.locale())">{{ i18n.t('home.areaLookup') }}</a>
      </div>
    </section>
  `,
  styles: `
    .hero {
      position: relative;
      overflow: hidden;
      border-bottom: 1px solid var(--border);
      background:
        radial-gradient(circle at 82% 22%, color-mix(in srgb, var(--brand) 18%, transparent), transparent 28rem),
        linear-gradient(145deg, var(--surface) 0%, var(--background) 65%);
    }
    .hero-grid {
      display: grid;
      gap: var(--space-10);
      align-items: center;
      min-height: 37rem;
      padding-block: var(--space-16);
    }
    .hero-copy {
      display: grid;
      gap: var(--space-6);
      max-width: 43rem;
    }
    .hero-intro {
      max-width: 39rem;
      color: var(--text-secondary);
      font-size: clamp(1.05rem, 2vw, 1.25rem);
    }
    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-4);
    }
    .vehicle-visual {
      position: relative;
      min-height: 20rem;
      display: grid;
      place-items: center;
    }
    .vehicle-visual::before {
      content: '';
      position: absolute;
      width: min(22rem, 82vw);
      aspect-ratio: 1;
      border: 1px solid color-mix(in srgb, var(--brand) 28%, transparent);
      border-radius: 50%;
    }
    .road-line {
      position: absolute;
      width: 130%;
      height: 7rem;
      transform: rotate(-9deg);
      border-block: 1px solid var(--border);
      background: color-mix(in srgb, var(--surface-subtle) 70%, transparent);
    }
    .road-line::after {
      content: '';
      position: absolute;
      top: 50%;
      width: 100%;
      border-top: 2px dashed color-mix(in srgb, var(--text-muted) 38%, transparent);
    }
    .vehicle-card {
      position: relative;
      z-index: 1;
      width: min(20rem, 82vw);
      display: grid;
      gap: var(--space-3);
      padding: var(--space-6);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: color-mix(in srgb, var(--surface) 92%, transparent);
      box-shadow: 0 1.5rem 4rem color-mix(in srgb, var(--brand) 13%, transparent);
      backdrop-filter: blur(1rem);
    }
    .vehicle-icon,
    .feature-icon,
    .future-icon {
      display: grid;
      place-items: center;
      width: 3rem;
      height: 3rem;
      border-radius: var(--radius);
      background: var(--brand-subtle);
      color: var(--brand);
    }
    .vehicle-icon tn-icon {
      width: 1.75rem;
      height: 1.75rem;
    }
    .vehicle-card-label,
    .source-line {
      color: var(--text-secondary);
      font-size: var(--text-caption);
    }
    .vehicle-card strong {
      font-size: 1.35rem;
    }
    .source-line {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding-top: var(--space-3);
      border-top: 1px solid var(--border);
    }
    .orbit {
      position: absolute;
      z-index: 2;
      display: grid;
      place-items: center;
      width: 2.75rem;
      height: 2.75rem;
      border: 1px solid var(--border);
      border-radius: 50%;
      background: var(--surface);
      color: var(--brand);
      box-shadow: var(--shadow);
    }
    .orbit-one {
      top: 2rem;
      right: 5%;
    }
    .orbit-two {
      bottom: 1rem;
      left: 3%;
    }
    .section-heading {
      display: grid;
      gap: var(--space-5);
      margin-bottom: var(--space-8);
    }
    .section-heading > div {
      display: grid;
      gap: var(--space-2);
    }
    .section-heading > p {
      max-width: 38rem;
    }
    .feature-card {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-6);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface);
      color: var(--text-primary);
      text-decoration: none;
      box-shadow: var(--shadow);
      transition:
        transform var(--duration) var(--ease),
        border-color var(--duration) var(--ease);
    }
    .feature-card:hover {
      transform: translateY(-2px);
      border-color: var(--brand);
    }
    .feature-copy {
      display: grid;
      gap: var(--space-1);
    }
    .feature-copy strong {
      font-size: var(--text-card);
    }
    .feature-copy > span:last-child {
      color: var(--text-secondary);
      font-size: var(--text-small);
    }
    .feature-label {
      color: var(--brand);
      font-size: var(--text-caption);
      font-weight: 650;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .future-section {
      border-block: 1px solid var(--border);
      background: var(--surface-subtle);
    }
    .future-grid,
    .value-grid {
      display: grid;
      gap: var(--space-4);
    }
    .future-item {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: var(--space-4);
      align-items: start;
      padding: var(--space-5);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
    }
    .future-item .badge {
      grid-column: 2;
    }
    .future-item p,
    .value-item p {
      margin-top: var(--space-2);
    }
    .value-item {
      display: grid;
      gap: var(--space-3);
      padding-block: var(--space-3);
    }
    .value-item > tn-icon {
      color: var(--brand);
      width: 1.5rem;
      height: 1.5rem;
    }
    .other-tools {
      display: grid;
      gap: var(--space-6);
      margin-bottom: var(--space-16);
      padding: var(--space-6);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface);
    }
    .other-tools > div:first-child {
      display: grid;
      gap: var(--space-2);
    }
    .other-links {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3) var(--space-6);
      align-items: center;
    }
    .other-links a {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      font-size: var(--text-small);
    }
    @media (min-width: 48rem) {
      .hero-grid {
        grid-template-columns: minmax(0, 1.15fr) minmax(18rem, 0.85fr);
      }
      .section-heading {
        grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr);
        align-items: end;
      }
      .compact-heading {
        grid-template-columns: 1fr;
      }
      .future-grid,
      .value-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .other-tools {
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
      }
      .other-links {
        justify-content: flex-end;
      }
    }
    @media (min-width: 64rem) {
      .future-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
      .future-item {
        grid-template-columns: 1fr;
      }
      .future-item .badge {
        grid-column: 1;
      }
      .value-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
    }
  `,
})
export class HomeComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly trafficFinePath = trafficFinePath;
  protected readonly vehiclePath = vehiclePath;
  protected readonly phonePath = phonePath;
  protected readonly areaPath = areaPath;
  protected get futureItems(): readonly { icon: IconName; title: TranslationKey; description: TranslationKey }[] {
    return [
      { icon: 'car', title: 'home.futureGarageTitle', description: 'home.futureGarageDescription' },
      { icon: 'bell', title: 'home.futureReminderTitle', description: 'home.futureReminderDescription' },
      { icon: 'tool', title: 'home.futureCareTitle', description: 'home.futureCareDescription' },
    ];
  }
  protected get valueItems(): readonly { icon: IconName; title: TranslationKey; description: TranslationKey }[] {
    return [
      { icon: 'info', title: 'home.valueSourceTitle', description: 'home.valueSourceDescription' },
      { icon: 'car', title: 'home.valueVietnamTitle', description: 'home.valueVietnamDescription' },
      { icon: 'grid', title: 'home.valueVehiclesTitle', description: 'home.valueVehiclesDescription' },
      { icon: 'shield', title: 'home.valuePrivacyTitle', description: 'home.valuePrivacyDescription' },
    ];
  }
}
