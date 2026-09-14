import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { LocaleService } from '../i18n/locale.service';
import { areaPath, supportedLocales } from '../i18n/routes';
import { SeoPageConfig } from '../seo/models';
import { SeoService } from '../seo/seo.service';
import { absoluteUrl } from '../seo/site-config';
import { AreaApi } from './area-api.service';
import { areaAnswer, areaCopy, areaHeading } from './area-copy';
import { AreaCodeResult, AreaError } from './area-data';
export interface AreaPageData {
  row: AreaCodeResult | null;
  items: AreaCodeResult[];
  related: AreaCodeResult[];
  status: 200 | 404 | 503;
  seo: SeoPageConfig;
}
export const areaResolver: ResolveFn<AreaPageData> = async (route) => {
  const api = inject(AreaApi);
  const seo = inject(SeoService);
  const locale = inject(LocaleService).locale();
  const copy = areaCopy(locale);
  const code = route.paramMap.get('code');
  let row: AreaCodeResult | null = null;
  let items: AreaCodeResult[] = [];
  let related: AreaCodeResult[] = [];
  let status: AreaPageData['status'] = 200;
  try {
    if (code) {
      if (!/^0[1-9]\d{0,2}$/.test(code)) throw new AreaError(404);
      row = await api.detail(code);
      if (row.code !== code) throw new AreaError(503);
      if (!['ACTIVE', 'LEGACY'].includes(row.status)) throw new AreaError(404);
      related = (await api.related(code).catch(() => [])).filter(
        (r) => ['ACTIVE', 'LEGACY'].includes(r.status) && r.code !== code,
      );
    } else {
      items = await api.catalogue();
      if (!items.length) throw new AreaError(503);
    }
  } catch (error) {
    status = error instanceof AreaError && [400, 404].includes(error.status) ? 404 : 503;
  }
  const path = areaPath(locale, code ?? undefined);
  const title =
    status === 404 ? copy.missing : status === 503 ? copy.unavailable : row ? areaHeading(row, locale) : copy.index;
  const description =
    status === 404
      ? copy.missingBody
      : status === 503
        ? copy.unavailableBody
        : row
          ? `${areaAnswer(row, locale)} ${copy.evidence}`
          : copy.intro;
  const breadcrumbs = [
    { label: copy.home, url: `/${locale}` },
    { label: copy.lookup },
    { label: copy.short, ...(code ? { url: areaPath(locale) } : {}) },
    ...(code && status === 200 ? [{ label: code }] : []),
  ];
  const config: SeoPageConfig = {
    title:
      row && row.status === 'ACTIVE' && locale === 'vi' && status === 200
        ? `${title} Tra cứu mã vùng ${row.code}`
        : title,
    description,
    locale,
    status,
    breadcrumbs,
    robots: { index: status === 200 && route.queryParamMap.keys.length === 0, follow: true },
    ...(status === 200
      ? {
          canonicalPath: path,
          alternateLocales: supportedLocales.map((target) => ({
            locale: target,
            path: areaPath(target, code ?? undefined),
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
