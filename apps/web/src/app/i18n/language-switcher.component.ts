import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ButtonDirective } from '../design-system/button.directive';
import { LocaleService } from './locale.service';

@Component({
  selector: 'tn-language-switcher',
  imports: [ButtonDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      role="group"
      [id]="controlId()"
      [attr.aria-label]="i18n.t('language.switch')"
    >
      @for (locale of i18n.supportedLocales; track locale) {
        <button
          tnButton
          type="button"
          size="small"
          [variant]="i18n.locale() === locale ? 'secondary' : 'ghost'"
          [attr.lang]="locale"
          [attr.aria-label]="i18n.t(locale === 'vi' ? 'language.vi' : 'language.en')"
          [attr.aria-pressed]="i18n.locale() === locale"
          (click)="i18n.switchLocale(locale)"
        >
          {{ compact() ? locale.toUpperCase() : i18n.t(locale === 'vi' ? 'language.vi' : 'language.en') }}
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    div {
      display: flex;
      gap: var(--space-1);
    }
    button {
      min-width: 44px;
      min-height: 44px;
    }
  `,
})
export class LanguageSwitcherComponent {
  protected readonly i18n = inject(LocaleService);
  readonly controlId = input.required<string>();
  readonly compact = input(false);
}
