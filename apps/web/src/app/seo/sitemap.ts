import { supportedLocales } from '../i18n/routes';
import { seoPages } from './page-registry';
import { absoluteUrl, PublicSiteConfig } from './site-config';

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
export function sitemapUrls(config: PublicSiteConfig): string[] {
  if (!config.origin || !config.allowIndexing) return [];
  const origin = config.origin;
  return Object.values(seoPages)
    .filter((page) => page.robots.index)
    .flatMap((page) => supportedLocales.map((locale) => absoluteUrl(origin, page.paths[locale])))
    .sort();
}
export function sitemapXml(urls: readonly string[]): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    urls.map((url) => `<url><loc>${escapeXml(url)}</loc></url>`).join('') +
    '</urlset>'
  );
}
export function sitemapIndexXml(origin: string, segments: readonly string[] = ['/sitemap-static.xml']): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    segments.map((path) => `<sitemap><loc>${escapeXml(absoluteUrl(origin, path))}</loc></sitemap>`).join('') +
    '</sitemapindex>'
  );
}
export function robotsTxt(config: PublicSiteConfig): string {
  if (!config.allowIndexing || !config.origin) return 'User-agent: *\nDisallow: /\n';
  return `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${config.origin}/sitemap.xml\n`;
}
