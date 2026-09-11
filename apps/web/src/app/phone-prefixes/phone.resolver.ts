import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { LocaleService } from '../i18n/locale.service';
import { phonePath, supportedLocales } from '../i18n/routes';
import { SeoPageConfig } from '../seo/models';
import { SeoService } from '../seo/seo.service';
import { absoluteUrl } from '../seo/site-config';
import { PhoneApi } from './phone-api.service';
import { phoneAnswer, phoneCopy, phoneHeading } from './phone-copy';
import { PhoneError, PhonePrefixResult } from './phone-data';
export interface PhonePageData {
  row: PhonePrefixResult | null;
  items: PhonePrefixResult[];
  related: PhonePrefixResult[];
  status: 200 | 404 | 503;
  seo: SeoPageConfig;
}
export const phoneResolver: ResolveFn<PhonePageData> = async (route) => {
  const api = inject(PhoneApi);
  const seo = inject(SeoService);
  const locale = inject(LocaleService).locale();
  const copy = phoneCopy(locale);
  const prefix = route.paramMap.get('prefix');
  let row: PhonePrefixResult | null = null;
  let items: PhonePrefixResult[] = [];
  let related: PhonePrefixResult[] = [];
  let status: PhonePageData['status'] = 200;
  try {
    if (prefix) {
      if (!/^\d{3,4}$/.test(prefix)) throw new PhoneError(404);
      row = await api.detail(prefix);
      if (row.prefix !== prefix) throw new PhoneError(503);
      if (!['ACTIVE', 'LEGACY'].includes(row.status)) throw new PhoneError(404);
      // Related links are supplementary; a failure must not hide a verified primary answer.
      related = await api.related(prefix).catch(() => []);
      related = related.filter(
        (r) => r.status === 'ACTIVE' && r.operator.key === row?.operator.key && r.prefix !== prefix,
      );
    } else {
      items = await api.catalogue();
      if (!items.length) throw new PhoneError(503);
    }
  } catch (error) {
    status = error instanceof PhoneError && [400, 404].includes(error.status) ? 404 : 503;
  }
  const path = phonePath(locale, prefix ?? undefined);
  const title =
    status === 404 ? copy.missing : status === 503 ? copy.unavailable : row ? phoneHeading(row, locale) : copy.index;
  const description =
    status === 404
      ? copy.missingBody
      : status === 503
        ? copy.unavailableBody
        : row
          ? `${phoneAnswer(row, locale)} ${copy.intro}`
          : copy.intro;
  const breadcrumbs = [
    { label: copy.home, url: `/${locale}` },
    { label: copy.lookup },
    { label: copy.short, ...(prefix ? { url: phonePath(locale) } : {}) },
    ...(prefix && status === 200 ? [{ label: prefix }] : []),
  ];
  const config: SeoPageConfig = {
    title:
      row && row.status === 'ACTIVE' && locale === 'vi' && status === 200
        ? `${title} Tra cứu đầu số ${row.prefix}`
        : title,
    description,
    locale,
    status,
    breadcrumbs,
    robots: { index: status === 200 && route.queryParamMap.keys.length === 0, follow: true },
    ...(status === 200
      ? {
          canonicalPath: path,
          alternateLocales: supportedLocales.map((locale) => ({
            locale,
            path: phonePath(locale, prefix ?? undefined),
          })),
          structuredData: seo.site.origin
            ? [
                {
                  '@type': 'WebPage' as const,
                  name: title,
                  url: absoluteUrl(seo.site.origin, path),
                  inLanguage: locale,
                },
              ]
            : [],
        }
      : {}),
  };
  seo.apply(config);
  return { row, items, related, status, seo: config };
};
