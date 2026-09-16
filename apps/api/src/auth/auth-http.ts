import type { CookieOptions, Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

export const ACCESS_COOKIE = 'tn_access';
export const REFRESH_COOKIE = 'tn_refresh';
export const CSRF_COOKIE = 'tn_csrf';
export function readCookies(request: Request): Record<string, string> {
  const header = request.headers.cookie;
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').flatMap((part) => {
      const index = part.indexOf('=');
      if (index < 1) return [];
      try {
        return [[part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())]];
      } catch {
        return [];
      }
    }),
  );
}
function options(config: ConfigService, path: string, httpOnly: boolean, maxAge: number): CookieOptions {
  return {
    httpOnly,
    maxAge,
    path,
    sameSite: 'strict',
    secure: config.getOrThrow<boolean>('AUTH_COOKIE_SECURE'),
  };
}
export interface AuthCookieBundle {
  accessToken: string;
  accessExpiresAt: Date;
  refreshToken: string;
  refreshExpiresAt: Date;
  csrfToken: string;
}
export function setAuthCookies(response: Response, config: ConfigService, bundle: AuthCookieBundle): void {
  response.cookie(
    ACCESS_COOKIE,
    bundle.accessToken,
    options(config, '/api/v1', true, bundle.accessExpiresAt.getTime() - Date.now()),
  );
  response.cookie(
    REFRESH_COOKIE,
    bundle.refreshToken,
    options(config, '/api/v1/auth', true, bundle.refreshExpiresAt.getTime() - Date.now()),
  );
  response.cookie(
    CSRF_COOKIE,
    bundle.csrfToken,
    options(config, '/', false, bundle.refreshExpiresAt.getTime() - Date.now()),
  );
}
export function clearAuthCookies(response: Response, config: ConfigService): void {
  for (const [name, path, httpOnly] of [
    [ACCESS_COOKIE, '/api/v1', true],
    [REFRESH_COOKIE, '/api/v1/auth', true],
    [CSRF_COOKIE, '/', false],
  ] as const)
    response.clearCookie(name, options(config, path, httpOnly, 0));
}
