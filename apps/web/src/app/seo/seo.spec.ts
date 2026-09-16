import { DOCUMENT } from '@angular/common';
import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { en } from '../i18n/en';
import { vi } from '../i18n/vi';
import { pageTitle, safeJsonLd, titleNeedsReview } from './models';
import { PUBLIC_SITE_CONFIG, SeoService } from './seo.service';
import { absoluteUrl, readSiteConfig, redirectPath, safeSiteConfig } from './site-config';
import { robotsTxt, sitemapIndexXml, sitemapUrls, sitemapXml } from './sitemap';

const site = { origin: 'https://seo.example.test', allowIndexing: true };

describe('public site configuration and URL policy', () => {
  it('fails closed without configuration and rejects invalid production origins', () => {
    expect(readSiteConfig({})).toEqual(safeSiteConfig);
    expect(() => readSiteConfig({ NODE_ENV: 'production', PUBLIC_SITE_URL: 'http://localhost' })).toThrow();
    expect(() => readSiteConfig({ PUBLIC_ALLOW_INDEXING: 'yes' })).toThrow();
    expect(() => readSiteConfig({ PUBLIC_ALLOW_INDEXING: 'true' })).toThrow();
    for (const origin of [
      'http://localhost',
      'https://localhost',
      'https://user:pass@example.test',
      'https://example.test/path',
      'https://example.test/?x=1',
      'javascript:alert(1)',
    ]) {
      expect(() => readSiteConfig({ PUBLIC_SITE_URL: origin, PUBLIC_ALLOW_INDEXING: 'true' })).toThrow();
    }
    expect(readSiteConfig({ PUBLIC_SITE_URL: site.origin, PUBLIC_ALLOW_INDEXING: 'true' })).toEqual(site);
  });
  it('normalizes canonical and deliberate redirects without query or open redirect leakage', () => {
    expect(absoluteUrl(site.origin, '/EN/?utm_source=test#section')).toBe(site.origin + '/en');
    expect(() => absoluteUrl(site.origin, '//evil.test')).toThrow();
    expect(() => absoluteUrl(site.origin, 'https://evil.test')).toThrow();
    expect(redirectPath('/')).toBe('/vi');
    expect(redirectPath('/EN//design-system/')).toBe('/en/design-system');
    expect(redirectPath('/fr')).toBeNull();
    expect(pageTitle('TraNhanh')).toBe('TraNhanh');
    expect(pageTitle('A useful page')).toBe('A useful page | TraNhanh');
    expect(titleNeedsReview('A long meaningful title '.repeat(5))).toBe(true);
  });
  it('generates parseable XML from the indexable registry only', () => {
    const urls = sitemapUrls(site);
    expect(urls).toEqual([
      site.origin + '/en',
      site.origin + '/en/lookup/traffic-fines',
      site.origin + '/vi',
      site.origin + '/vi/tra-cuu/phat-nguoi',
    ]);
    for (const xml of [sitemapXml(urls), sitemapIndexXml(site.origin)]) {
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      expect(doc.querySelector('parsererror')).toBeNull();
      expect(doc.querySelectorAll('loc').length).toBeGreaterThan(0);
    }
    expect(sitemapXml(urls)).not.toContain('design-system');
    expect(robotsTxt(site)).toContain(`Sitemap: ${site.origin}/sitemap.xml`);
    expect(robotsTxt(site)).not.toContain('Disallow: /vi');
    expect(sitemapUrls(safeSiteConfig)).toEqual([]);
    expect(robotsTxt(safeSiteConfig)).toBe('User-agent: *\nDisallow: /\n');
  });
});

describe('centralized route SEO', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: PUBLIC_SITE_CONFIG, useValue: site },
        { provide: RESPONSE_INIT, useValue: {} },
      ],
    }),
  );

  it('replaces metadata on navigation, including showcase and localized 404 cleanup', async () => {
    const harness = await RouterTestingHarness.create('/vi');
    const document = TestBed.inject(DOCUMENT);
    const seo = TestBed.inject(SeoService);
    const canonical = () => document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
    expect(document.title).toBe(vi['seo.home.title']);
    expect(canonical()).toBe(site.origin + '/vi');
    const homeSchema = JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}');
    expect(homeSchema['@type']).toBe('WebSite');
    expect(homeSchema.description).toBe(vi['seo.home.description']);
    expect(homeSchema.potentialAction).toBeUndefined();
    expect(document.querySelectorAll('link[hreflang]').length).toBe(2);
    await harness.navigateByUrl('/en?utm_source=test');
    expect(document.title).toBe(en['seo.home.title']);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      en['seo.home.description'],
    );
    expect(canonical()).toBe(site.origin + '/en');
    expect(document.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(document.querySelector('meta[property="og:locale"]')?.getAttribute('content')).toBe('en_US');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index, follow');
    await harness.navigateByUrl('/en/design-system');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
    const schema = JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}');
    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement.map((item: { name: string }) => item.name)).toEqual(
      seo.active()?.breadcrumbs?.map((crumb) => crumb.label),
    );
    await harness.navigateByUrl('/en/not-a-page');
    expect(harness.routeNativeElement?.textContent).toContain(en['seo.notFound.title']);
    expect(TestBed.inject(RESPONSE_INIT)?.status).toBe(404);
    expect(canonical()).toBeUndefined();
    expect(document.querySelectorAll('link[hreflang], script[type="application/ld+json"]').length).toBe(0);
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, follow');
    await harness.navigateByUrl('/vi');
    expect(TestBed.inject(RESPONSE_INIT)?.status).toBe(200);
    expect(canonical()).toBe(site.origin + '/vi');
  });

  it('safely serializes JSON-LD and supports data-dependent page configuration', () => {
    const name = '</script><script>alert("x")</script>';
    const serialized = safeJsonLd({ '@type': 'WebPage', name, url: site.origin });
    expect(serialized).not.toContain('<');
    expect(JSON.parse(serialized).name).toBe(name);
    const seo = TestBed.inject(SeoService);
    seo.apply({
      title: name,
      description: 'A "quoted" & truthful description',
      locale: 'en',
      canonicalPath: '/en',
      robots: { index: true, follow: true },
      structuredData: [{ '@type': 'WebPage', name, url: site.origin }],
    });
    const document = TestBed.inject(DOCUMENT);
    expect(document.querySelectorAll('script[type="application/ld+json"]').length).toBe(1);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'A "quoted" & truthful description',
    );
  });
});
