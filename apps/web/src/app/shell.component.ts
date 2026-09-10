import { LocaleService } from './i18n/locale.service';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './layout/footer.component';
import { HeaderComponent } from './layout/header.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  selector: 'tn-shell',
  template: `
    <a
      class="button skip-link"
      href="#main-content"
      >{{ i18n.t('navigation.skip') }}</a
    >
    <tn-header />
    <main
      id="main-content"
      tabindex="-1"
    >
      <router-outlet />
    </main>
    <tn-footer />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    main {
      flex: 1;
      min-width: 0;
    }
  `,
})
export class ShellComponent {
  protected readonly i18n = inject(LocaleService);
}
