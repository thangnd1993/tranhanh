import { vehicleResolver } from './vehicle-plates/vehicle.resolver';
import { phoneResolver } from './phone-prefixes/phone.resolver';
import { areaResolver } from './area-codes/area.resolver';
import { pageSeo } from './seo/seo.resolver';
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
      ...['', '/:prefix'].map((suffix) => ({
        path: (locale === 'vi' ? 'tra-cuu/bien-so' : 'lookup/vehicle-plate') + suffix,
        resolve: { vehicle: vehicleResolver },
        runGuardsAndResolvers: 'paramsOrQueryParamsChange' as const,
        loadComponent: () => import('./vehicle-plates/vehicle-page.component').then((m) => m.VehiclePageComponent),
      })),
      ...['', '/:code'].map((suffix) => ({
        path: (locale === 'vi' ? 'tra-cuu/ma-vung' : 'lookup/area-code') + suffix,
        resolve: { area: areaResolver },
        runGuardsAndResolvers: 'paramsOrQueryParamsChange' as const,
        loadComponent: () => import('./area-codes/area-page.component').then((m) => m.AreaPageComponent),
      })),
      ...['', '/:prefix'].map((suffix) => ({
        path: (locale === 'vi' ? 'tra-cuu/dau-so' : 'lookup/phone-prefix') + suffix,
        resolve: { phone: phoneResolver },
        runGuardsAndResolvers: 'paramsOrQueryParamsChange' as const,
        loadComponent: () => import('./phone-prefixes/phone-page.component').then((m) => m.PhonePageComponent),
      })),
      {
        path: '',
        pathMatch: 'full' as const,
        resolve: { seo: pageSeo('home') },
        loadComponent: () => import('./pages/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'design-system',
        resolve: { seo: pageSeo('showcase') },
        loadComponent: () => import('./pages/showcase.component').then((m) => m.ShowcaseComponent),
      },
      {
        path: '**',
        resolve: { seo: pageSeo('notFound') },
        loadComponent: () => import('./pages/not-found.component').then((m) => m.NotFoundComponent),
      },
    ],
  })),
  {
    path: '**',
    component: ShellComponent,
    canActivate: [
      () => {
        inject(LocaleService).resolveRoute('vi');
        return true;
      },
    ],
    children: [
      {
        path: '',
        resolve: { seo: pageSeo('notFound') },
        loadComponent: () => import('./pages/not-found.component').then((m) => m.NotFoundComponent),
      },
    ],
  },
];
