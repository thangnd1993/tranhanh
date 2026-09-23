import { DOCUMENT } from '@angular/common';
import {
  inject,
  Injectable,
  InjectionToken,
  makeStateKey,
  REQUEST_CONTEXT,
  RESPONSE_INIT,
  signal,
  TransferState,
} from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { pageTitle, privateRobots, robotsContent, safeJsonLd, SeoPageConfig, StructuredDataDefinition } from './models';
import { absoluteUrl, PublicSiteConfig, safeSiteConfig } from './site-config';

const siteState = makeStateKey<PublicSiteConfig>('public-site-config');
export const PUBLIC_SITE_CONFIG = new InjectionToken<PublicSiteConfig>('PUBLIC_SITE_CONFIG', {
  providedIn: 'root',
  factory: () => {
    const transfer = inject(TransferState);
    const context = inject(REQUEST_CONTEXT, { optional: true }) as { siteConfig?: PublicSiteConfig } | null;
    const config = context?.siteConfig ?? transfer.get(siteState, safeSiteConfig);
    transfer.set(siteState, config);
    return config;
  },
});

@Injectable({ providedIn: 'root' })
export class SeoService {
  readonly site = inject(PUBLIC_SITE_CONFIG);
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly response = inject(RESPONSE_INIT, { optional: true });
  private readonly state = signal<SeoPageConfig | null>(null);
  /** Readonly inspection API for tests/development tools; no production debug panel. */
  readonly active = this.state.asReadonly();

  apply(config: SeoPageConfig): void {
    this.state.set(config);
    this.document.querySelectorAll('[data-tn-seo]').forEach((node) => node.remove());
    const title = pageTitle(config.title);
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: config.description });
    const policy = config.robots ?? privateRobots;
    const robots = robotsContent({ ...policy, index: policy.index && this.site.allowIndexing });
    this.meta.updateTag({ name: 'robots', content: robots });
    if (!policy.index) this.name('referrer', 'no-referrer');
    if (this.response) {
      this.response.status = config.status ?? 200;
      const headers = new Headers(this.response.headers);
      headers.set('X-Robots-Tag', robots);
      if (!policy.index) {
        headers.set('Cache-Control', 'private, no-store');
        headers.set('Referrer-Policy', 'no-referrer');
      }
      this.response.headers = headers;
    }
    const og = config.openGraph;
    this.property('og:title', og?.title ?? title);
    this.property('og:description', og?.description ?? config.description);
    this.property('og:type', og?.type ?? 'website');
    this.property('og:locale', config.locale === 'vi' ? 'vi_VN' : 'en_US');
    this.name('twitter:card', og?.image ? 'summary_large_image' : 'summary');
    this.name('twitter:title', og?.title ?? title);
    this.name('twitter:description', og?.description ?? config.description);
    if (og?.image) {
      const image = new URL(og.image.url);
      if (image.protocol !== 'https:') throw new Error('Social images require an actual HTTPS asset');
      this.property('og:image', image.href);
      this.property('og:image:alt', og.image.alt);
      this.name('twitter:image', image.href);
      this.name('twitter:image:alt', og.image.alt);
    }
    // A 404 never advertises itself as a canonical public page or a translated equivalent.
    if (!this.site.origin || (config.status && config.status !== 200)) return;
    const origin = this.site.origin;
    if (config.canonicalPath) {
      const canonical = absoluteUrl(origin, config.canonicalPath);
      this.link('canonical', canonical);
      this.property('og:url', canonical);
    }
    if (policy.index) {
      for (const alternate of config.alternateLocales ?? []) {
        this.link('alternate', absoluteUrl(origin, alternate.path), alternate.locale);
        if (alternate.locale !== config.locale) {
          this.property('og:locale:alternate', alternate.locale === 'vi' ? 'vi_VN' : 'en_US');
        }
      }
    }
    const definitions: StructuredDataDefinition[] = [...(config.structuredData ?? [])];
    if (config.breadcrumbs && config.breadcrumbs.length > 1) {
      definitions.push({
        '@type': 'BreadcrumbList',
        itemListElement: config.breadcrumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.label,
          ...(crumb.url ? { item: absoluteUrl(origin, crumb.url) } : {}),
        })),
      });
    }
    for (const definition of definitions) {
      const script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = safeJsonLd(definition);
      this.append(script);
    }
  }

  private append(element: HTMLElement): void {
    element.setAttribute('data-tn-seo', '');
    this.document.head.appendChild(element);
  }
  private property(property: string, content: string): void {
    const tag = this.document.createElement('meta');
    tag.setAttribute('property', property);
    tag.content = content;
    this.append(tag);
  }
  private name(name: string, content: string): void {
    const tag = this.document.createElement('meta');
    tag.name = name;
    tag.content = content;
    this.append(tag);
  }
  private link(rel: string, href: string, hreflang?: string): void {
    const link = this.document.createElement('link');
    link.rel = rel;
    link.href = href;
    if (hreflang) link.hreflang = hreflang;
    this.append(link);
  }
}
