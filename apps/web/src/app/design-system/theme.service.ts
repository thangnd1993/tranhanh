import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { afterNextRender, DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';
export const THEME_STORAGE_KEY = 'tranhanh.theme';

export function parseTheme(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): 'light' | 'dark' {
  return preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platform = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly selection = signal<ThemePreference>('system');
  private readonly appearance = signal<'light' | 'dark'>('light');
  readonly preference = this.selection.asReadonly();
  readonly resolved = this.appearance.asReadonly();

  constructor() {
    // Server and first hydration render share the same control state.
    afterNextRender(() => this.initialize());
  }

  setPreference(value: ThemePreference): void {
    this.selection.set(value);
    if (!isPlatformBrowser(this.platform)) return;
    try {
      this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      // The preference still works for this page when storage is blocked.
    }
    this.apply();
  }

  private initialize(): void {
    if (!isPlatformBrowser(this.platform)) return;
    const view = this.document.defaultView;
    if (!view) return;
    try {
      this.selection.set(parseTheme(view.localStorage.getItem(THEME_STORAGE_KEY)));
    } catch {
      this.selection.set('system');
    }
    const media = view.matchMedia?.('(prefers-color-scheme: dark)');
    const update = () => this.apply();
    const sync = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        this.selection.set(parseTheme(event.newValue));
        this.apply();
      }
    };
    media?.addEventListener('change', update);
    view.addEventListener('storage', sync);
    this.destroyRef.onDestroy(() => {
      media?.removeEventListener('change', update);
      view.removeEventListener('storage', sync);
    });
    this.apply();
  }

  private apply(): void {
    const preference = this.selection();
    const systemDark = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    this.appearance.set(resolveTheme(preference, systemDark));
    if (preference === 'system') {
      this.document.documentElement.removeAttribute('data-theme');
    } else {
      this.document.documentElement.setAttribute('data-theme', preference);
    }
  }
}
