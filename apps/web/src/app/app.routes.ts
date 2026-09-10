import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { LocaleService } from './i18n/locale.service';
import { supportedLocales } from './i18n/routes';
import { ShellComponent } from './shell.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'vi' },
  { path: 'design-system', pathMatch: 'full', redirectTo: 'vi/design-system' },
  ...supportedLocales.map((locale) => ({
    path: locale,
    component: ShellComponent,
    canActivate: [
      () => {
        inject(LocaleService).resolveRoute(locale);
        return true;
      },
    ],
    children: [
      {
        path: '',
        pathMatch: 'full' as const,
        title: () => `TraNhanh — ${inject(LocaleService).t('home.tagline')}`,
        loadComponent: () => import('./pages/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'design-system',
        title: () => `${inject(LocaleService).t('navigation.showcase')} · TraNhanh`,
        loadComponent: () => import('./pages/showcase.component').then((m) => m.ShowcaseComponent),
      },
      { path: '**', redirectTo: '' },
    ],
  })),
  { path: '**', redirectTo: 'vi' },
];
