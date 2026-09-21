import { AuthService } from '../auth/auth.service';
import { LocaleService } from '../i18n/locale.service';
import { fuelPricePath, garagePath, trafficFinePath, vehiclePath } from '../i18n/routes';
import { LanguageSwitcherComponent } from '../i18n/language-switcher.component';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonDirective } from '../design-system/button.directive';
import { IconComponent } from '../design-system/icon.component';
import { parseTheme, ThemeService } from '../design-system/theme.service';

@Component({
  selector: 'tn-header',
  imports: [LanguageSwitcherComponent, RouterLink, RouterLinkActive, ButtonDirective, IconComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'closeMenu(true)' },
})
export class HeaderComponent {
  protected readonly trafficFinePath = trafficFinePath;
  protected readonly vehiclePath = vehiclePath;
  protected readonly garagePath = garagePath;
  protected readonly fuelPricePath = fuelPricePath;
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(LocaleService);
  protected readonly theme = inject(ThemeService);
  readonly menuOpen = signal(false);
  private readonly toggle = viewChild<ElementRef<HTMLButtonElement>>('toggle');
  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd) this.closeMenu(false);
    });
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
    this.changeDetector.detectChanges();
  }

  closeMenu(restoreFocus = false): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    this.changeDetector.detectChanges();
    if (restoreFocus) this.toggle()?.nativeElement.focus();
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl(this.i18n.path('home'));
  }

  protected changeTheme(event: Event): void {
    this.theme.setPreference(parseTheme((event.target as HTMLSelectElement).value));
  }
}
