export interface PublicSiteConfig {
  origin: string | null;
  allowIndexing: boolean;
}
export const safeSiteConfig: PublicSiteConfig = { origin: null, allowIndexing: false };

export function readSiteConfig(env: Record<string, string | undefined>): PublicSiteConfig {
  const flag = env['PUBLIC_ALLOW_INDEXING'] ?? 'false';
  if (flag !== 'true' && flag !== 'false') throw new Error('PUBLIC_ALLOW_INDEXING must be true or false');
  const raw = env['PUBLIC_SITE_URL']?.trim();
  let origin: string | null = null;
  if (raw) {
    const url = new URL(raw);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      throw new Error('PUBLIC_SITE_URL must be an HTTP(S) origin without credentials, path, query or fragment');
    }
    if (
      (flag === 'true' || env['NODE_ENV'] === 'production') &&
      (url.protocol !== 'https:' ||
        /^(localhost|127\.|\[::1\])/.test(url.hostname) ||
        url.hostname.endsWith('.localhost'))
    ) {
      throw new Error('Indexing requires a public HTTPS origin');
    }
    origin = url.origin;
  }
  if (flag === 'true' && !origin) throw new Error('PUBLIC_SITE_URL is required when indexing is enabled');
  return { origin, allowIndexing: flag === 'true' };
}

/** Only normalize path structure, never accept an external URL as a canonical path. */
export function normalizePath(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    throw new Error('Expected a same-site absolute path');
  }
  const clean =
    path
      .split(/[?#]/, 1)[0]
      .replace(/\/{2,}/g, '/')
      .replace(/\/+$/, '') || '/';
  return clean.replace(/^\/(VI|EN)(?=\/|$)/i, (locale) => locale.toLowerCase());
}
export function absoluteUrl(origin: string, path: string): string {
  return new URL(normalizePath(path), origin).href;
}

/** Only known normalization/legacy rules redirect; arbitrary unknown paths remain 404s. */
export function redirectPath(path: string): string | null {
  const collapsed = '/' + path.replace(/^\/+/, '').replace(/\/{2,}/g, '/');
  let normalized = normalizePath(collapsed);
  if (normalized === '/') normalized = '/vi';
  if (normalized === '/design-system') normalized = '/vi/design-system';
  return normalized === path ? null : normalized;
}
