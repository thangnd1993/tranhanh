import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'TraNhanh — Cần biết gì, tra ngay.',
    loadComponent: () => import('./pages/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'design-system',
    title: 'Bộ giao diện · TraNhanh',
    loadComponent: () => import('./pages/showcase.component').then((m) => m.ShowcaseComponent),
  },
];
