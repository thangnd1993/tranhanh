import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'design-system',
    renderMode: RenderMode.Server,
    headers: { 'X-Robots-Tag': 'noindex, nofollow' },
  },
  { path: '', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Server },
];
