import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { LocaleService } from '../i18n/locale.service';
import { PageId, supportedLocales } from '../i18n/routes';
import { SeoPageConfig } from './models';
import { seoPages } from './page-registry';
import { absoluteUrl } from './site-config';
import { SeoService } from './seo.service';

export function pageSeo(page: PageId | 'notFound'): ResolveFn<SeoPageConfig> {
  return () => {
    const i18n = inject(LocaleService);
    const seo = inject(SeoService);
    const locale = i18n.locale();
    if (page === 'notFound') {
      const config: SeoPageConfig = {
        title: i18n.t('seo.notFound.title'),
        description: i18n.t('seo.notFound.description'),
        locale,
        robots: { index: false, follow: true },
        status: 404,
      };
      seo.apply(config);
      return config;
    }
    const definition = seoPages[page];
    const path = definition.paths[locale];
    const config: SeoPageConfig = {
      title: i18n.t(definition.titleKey),
      description: i18n.t(definition.descriptionKey),
      locale,
      canonicalPath: path,
      robots: definition.robots,
      alternateLocales: supportedLocales.map((language) => ({ locale: language, path: definition.paths[language] })),
      ...(page === 'showcase'
        ? {
            breadcrumbs: [
              { label: i18n.t('navigation.home'), url: i18n.path('home') },
              { label: i18n.t('navigation.showcase') },
            ],
          }
        : {}),
    };
    if (page === 'home' && seo.site.origin) {
      config.structuredData = [
        {
          '@type': 'WebSite',
          name: 'TraNhanh',
          url: absoluteUrl(seo.site.origin, path),
          inLanguage: locale,
        },
      ];
    }
    seo.apply(config);
    return config;
  };
}
