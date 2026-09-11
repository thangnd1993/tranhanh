import { Locale } from '../i18n/routes';

export interface SeoRobotsConfig {
  index: boolean;
  follow: boolean;
}
export interface SeoBreadcrumb {
  label: string;
  url?: string;
}
export interface SeoLocaleAlternate {
  locale: Locale;
  path: string;
}
export interface SeoOpenGraphConfig {
  title?: string;
  description?: string;
  type?: 'website' | 'article';
  image?: { url: string; alt: string };
}
export type StructuredDataDefinition =
  | { '@type': 'WebSite' | 'Organization' | 'WebPage'; name: string; url: string; inLanguage?: Locale }
  | {
      '@type': 'BreadcrumbList';
      itemListElement: { '@type': 'ListItem'; position: number; name: string; item?: string }[];
    };

export interface SeoPageConfig {
  title: string;
  description: string;
  locale: Locale;
  canonicalPath?: string;
  robots?: SeoRobotsConfig;
  alternateLocales?: readonly SeoLocaleAlternate[];
  openGraph?: SeoOpenGraphConfig;
  structuredData?: readonly StructuredDataDefinition[];
  breadcrumbs?: readonly SeoBreadcrumb[];
  status?: 200 | 404 | 503;
}
export const publicRobots: SeoRobotsConfig = { index: true, follow: true };
export const privateRobots: SeoRobotsConfig = { index: false, follow: false };
export function robotsContent(policy: SeoRobotsConfig): string {
  return `${policy.index ? 'index' : 'noindex'}, ${policy.follow ? 'follow' : 'nofollow'}`;
}
export function pageTitle(title: string): string {
  const normalized = title.trim().replace(/\s+/g, ' ');
  return /\bTraNhanh\b/i.test(normalized) ? normalized : `${normalized} | TraNhanh`;
}
/** Diagnostic only: preserve editorial meaning instead of automatically truncating titles. */
export function titleNeedsReview(title: string): boolean {
  return pageTitle(title).length > 65;
}
export function safeJsonLd(definition: StructuredDataDefinition): string {
  return JSON.stringify({ '@context': 'https://schema.org', ...definition })
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
