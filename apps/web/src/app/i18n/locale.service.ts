import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Router } from '@angular/router';
import { en } from './en';
import { defaultLocale, equivalentPath, Locale, PageId, pagePaths, supportedLocales } from './routes';
import { TranslationKey, vi } from './vi';

export const LOCALE_STORAGE_KEY = 'tranhanh.locale';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly selected = signal<Locale>(defaultLocale);
  private readonly document = inject(DOCUMENT);
  private readonly platform = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  readonly locale = this.selected.asReadonly();
  readonly supportedLocales = supportedLocales;
  readonly defaultLocale = defaultLocale;

  /** Called by the route guard before the localized shell is created, on server and browser. */
  resolveRoute(locale: Locale): void {
    this.selected.set(locale);
    this.document.documentElement.lang = locale;
    this.document.querySelector('meta[name="description"]')?.setAttribute('content', this.t('footer.description'));
  }

  t(key: TranslationKey): string {
    return (this.locale() === 'vi' ? vi : en)[key];
  }

  path(page: PageId, locale = this.locale()): string {
    return pagePaths[page][locale];
  }

  async switchLocale(locale: Locale): Promise<boolean> {
    const current = this.router.parseUrl(this.router.url);
    const primary = current.root.children['primary'];
    const path = '/' + (primary?.segments.map((segment) => segment.path).join('/') ?? '');
    const target = this.router.parseUrl(equivalentPath(path, locale));
    target.queryParams = current.queryParams;
    target.fragment = current.fragment;
    const success = await this.router.navigateByUrl(target);
    if (success && isPlatformBrowser(this.platform)) {
      try {
        this.document.defaultView?.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      } catch {
        // Route-based switching remains available when storage is blocked.
      }
    }
    return success;
  }
}
