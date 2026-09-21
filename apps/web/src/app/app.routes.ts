import { accountGuard } from './auth/auth.guard';
import { vehicleResolver } from './vehicle-plates/vehicle.resolver';
import { phoneResolver } from './phone-prefixes/phone.resolver';
import { areaResolver } from './area-codes/area.resolver';
import { pageSeo } from './seo/seo.resolver';
import { fuelPriceResolver } from './fuel-prices/fuel-price.resolver';
import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { LocaleService } from './i18n/locale.service';
import { garagePath, supportedLocales } from './i18n/routes';
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
        path: locale === 'vi' ? 'gia-xang' : 'fuel-prices',
        resolve: { seo: pageSeo('fuelPrices'), fuel: fuelPriceResolver },
        loadComponent: () => import('./fuel-prices/fuel-price-page.component').then((m) => m.FuelPricePageComponent),
      },
      {
        path: locale === 'vi' ? 'tra-cuu/phat-nguoi' : 'lookup/traffic-fines',
        resolve: { seo: pageSeo('trafficFine') },
        loadComponent: () =>
          import('./traffic-fines/traffic-fine-page.component').then((m) => m.TrafficFinePageComponent),
      },
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
        path: locale === 'vi' ? 'dang-nhap' : 'login',
        resolve: { seo: pageSeo('login') },
        loadComponent: () => import('./auth/login-page.component').then((m) => m.LoginPageComponent),
      },
      {
        path: locale === 'vi' ? 'dang-ky' : 'register',
        resolve: { seo: pageSeo('register') },
        loadComponent: () => import('./auth/register-page.component').then((m) => m.RegisterPageComponent),
      },
      {
        path: locale === 'vi' ? 'tai-khoan' : 'account',
        canActivate: [accountGuard(locale)],
        resolve: { seo: pageSeo('account') },
        loadComponent: () => import('./auth/account-page.component').then((m) => m.AccountPageComponent),
      },
      {
        path: 'garage',
        canActivate: [accountGuard(locale, garagePath(locale))],
        resolve: { seo: pageSeo('garage') },
        loadComponent: () => import('./garage/garage-page.component').then((m) => m.GaragePageComponent),
      },
      {
        path: locale === 'vi' ? 'garage/them-xe' : 'garage/add',
        canActivate: [accountGuard(locale, garagePath(locale, undefined, 'add'))],
        resolve: { seo: pageSeo('garage') },
        loadComponent: () => import('./garage/vehicle-form-page.component').then((m) => m.VehicleFormPageComponent),
      },
      {
        path: locale === 'vi' ? 'garage/:id/nhien-lieu/them' : 'garage/:id/fuel-log/add',
        canActivate: [accountGuard(locale, garagePath(locale))],
        resolve: { seo: pageSeo('garage') },
        loadComponent: () => import('./fuel-log/fuel-log-form-page.component').then((m) => m.FuelLogFormPageComponent),
      },
      {
        path: locale === 'vi' ? 'garage/:id/nhien-lieu/:entryId/chinh-sua' : 'garage/:id/fuel-log/:entryId/edit',
        canActivate: [accountGuard(locale, garagePath(locale))],
        resolve: { seo: pageSeo('garage') },
        loadComponent: () => import('./fuel-log/fuel-log-form-page.component').then((m) => m.FuelLogFormPageComponent),
      },
      {
        path: locale === 'vi' ? 'garage/:id/nhien-lieu/:entryId' : 'garage/:id/fuel-log/:entryId',
        canActivate: [accountGuard(locale, garagePath(locale))],
        resolve: { seo: pageSeo('garage') },
        loadComponent: () =>
          import('./fuel-log/fuel-log-entry-page.component').then((m) => m.FuelLogEntryPageComponent),
      },
      {
        path: locale === 'vi' ? 'garage/:id/nhien-lieu' : 'garage/:id/fuel-log',
        canActivate: [accountGuard(locale, garagePath(locale))],
        resolve: { seo: pageSeo('garage') },
        loadComponent: () => import('./fuel-log/fuel-log-page.component').then((m) => m.FuelLogPageComponent),
      },
      {
        path: locale === 'vi' ? 'garage/:id/giay-to/them' : 'garage/:id/documents/add',
        canActivate: [accountGuard(locale, garagePath(locale))],
        resolve: { seo: pageSeo('garage') },
        loadComponent: () =>
          import('./garage/vehicle-document-form-page.component').then((m) => m.VehicleDocumentFormPageComponent),
      },
      {
        path: locale === 'vi' ? 'garage/:id/giay-to/:documentId/chinh-sua' : 'garage/:id/documents/:documentId/edit',
        canActivate: [accountGuard(locale, garagePath(locale))],
        resolve: { seo: pageSeo('garage') },
        loadComponent: () =>
          import('./garage/vehicle-document-form-page.component').then((m) => m.VehicleDocumentFormPageComponent),
      },
      {
        path: locale === 'vi' ? 'garage/:id/giay-to/:documentId' : 'garage/:id/documents/:documentId',
        canActivate: [accountGuard(locale, garagePath(locale))],
        resolve: { seo: pageSeo('garage') },
        loadComponent: () =>
          import('./garage/vehicle-document-detail-page.component').then((m) => m.VehicleDocumentDetailPageComponent),
      },
      {
        path: locale === 'vi' ? 'garage/:id/giay-to' : 'garage/:id/documents',
        canActivate: [accountGuard(locale, garagePath(locale))],
        resolve: { seo: pageSeo('garage') },
        loadComponent: () =>
          import('./garage/vehicle-documents-page.component').then((m) => m.VehicleDocumentsPageComponent),
      },
      {
        path: locale === 'vi' ? 'garage/:id/bao-duong/lich-su/them' : 'garage/:id/maintenance/history/add',
        canActivate: [accountGuard(locale, garagePath(locale))],
        resolve: { seo: pageSeo('garage') },
        loadComponent: () =>
          import('./maintenance/maintenance-history-form-page.component').then(
            (m) => m.MaintenanceHistoryFormPageComponent,
          ),
      },
      {
        path:
          locale === 'vi'
            ? 'garage/:id/bao-duong/lich-su/:historyId/chinh-sua'
            : 'garage/:id/maintenance/history/:historyId/edit',
        canActivate: [accountGuard(locale, garagePath(locale))],
        resolve: { seo: pageSeo('garage') },
        loadComponent: () =>
          import('./maintenance/maintenance-history-form-page.component').then(
            (m) => m.MaintenanceHistoryFormPageComponent,
          ),
      },
      {
        path: locale === 'vi' ? 'garage/:id/bao-duong/lich-su/:historyId' : 'garage/:id/maintenance/history/:historyId',
        canActivate: [accountGuard(locale, garagePath(locale))],
        resolve: { seo: pageSeo('garage') },
        loadComponent: () =>
          import('./maintenance/maintenance-history-detail-page.component').then(
            (m) => m.MaintenanceHistoryDetailPageComponent,
          ),
      },
      {
        path: locale === 'vi' ? 'garage/:id/bao-duong/ke-hoach/them' : 'garage/:id/maintenance/plans/add',
        canActivate: [accountGuard(locale, garagePath(locale))],
        resolve: { seo: pageSeo('garage') },
        loadComponent: () =>
          import('./maintenance/maintenance-plan-form-page.component').then((m) => m.MaintenancePlanFormPageComponent),
      },
      {
        path:
          locale === 'vi'
            ? 'garage/:id/bao-duong/ke-hoach/:planId/chinh-sua'
            : 'garage/:id/maintenance/plans/:planId/edit',
        canActivate: [accountGuard(locale, garagePath(locale))],
        resolve: { seo: pageSeo('garage') },
        loadComponent: () =>
          import('./maintenance/maintenance-plan-form-page.component').then((m) => m.MaintenancePlanFormPageComponent),
      },
      {
        path: locale === 'vi' ? 'garage/:id/bao-duong/ke-hoach/:planId' : 'garage/:id/maintenance/plans/:planId',
        canActivate: [accountGuard(locale, garagePath(locale))],
        resolve: { seo: pageSeo('garage') },
        loadComponent: () =>
          import('./maintenance/maintenance-plan-detail-page.component').then(
            (m) => m.MaintenancePlanDetailPageComponent,
          ),
      },
      {
        path: locale === 'vi' ? 'garage/:id/bao-duong/lich-su' : 'garage/:id/maintenance/history',
        canActivate: [accountGuard(locale, garagePath(locale))],
        resolve: { seo: pageSeo('garage') },
        loadComponent: () => import('./maintenance/maintenance-page.component').then((m) => m.MaintenancePageComponent),
      },
      {
        path: locale === 'vi' ? 'garage/:id/bao-duong/ke-hoach' : 'garage/:id/maintenance/plans',
        canActivate: [accountGuard(locale, garagePath(locale))],
        resolve: { seo: pageSeo('garage') },
        loadComponent: () => import('./maintenance/maintenance-page.component').then((m) => m.MaintenancePageComponent),
      },
      {
        path: locale === 'vi' ? 'garage/:id/bao-duong' : 'garage/:id/maintenance',
        canActivate: [accountGuard(locale, garagePath(locale))],
        resolve: { seo: pageSeo('garage') },
        loadComponent: () => import('./maintenance/maintenance-page.component').then((m) => m.MaintenancePageComponent),
      },
      {
        path: locale === 'vi' ? 'garage/:id/chinh-sua' : 'garage/:id/edit',
        canActivate: [accountGuard(locale, garagePath(locale))],
        resolve: { seo: pageSeo('garage') },
        loadComponent: () => import('./garage/vehicle-form-page.component').then((m) => m.VehicleFormPageComponent),
      },
      {
        path: 'garage/:id',
        canActivate: [accountGuard(locale, garagePath(locale))],
        resolve: { seo: pageSeo('garage') },
        loadComponent: () => import('./garage/vehicle-detail-page.component').then((m) => m.VehicleDetailPageComponent),
      },
      {
        path: locale === 'vi' ? 'quen-mat-khau' : 'forgot-password',
        resolve: { seo: pageSeo('forgotPassword') },
        loadComponent: () => import('./auth/forgot-password-page.component').then((m) => m.ForgotPasswordPageComponent),
      },
      {
        path: locale === 'vi' ? 'dat-lai-mat-khau' : 'reset-password',
        resolve: { seo: pageSeo('resetPassword') },
        loadComponent: () => import('./auth/reset-password-page.component').then((m) => m.ResetPasswordPageComponent),
      },
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
