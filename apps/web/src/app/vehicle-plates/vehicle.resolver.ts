import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { LocaleService } from '../i18n/locale.service';
import { vehiclePath, supportedLocales } from '../i18n/routes';
import { SeoPageConfig } from '../seo/models';
import { SeoService } from '../seo/seo.service';
import { absoluteUrl } from '../seo/site-config';
import { VehicleApi } from './vehicle-api.service';
import { vehicleAnswer, vehicleCopy, vehicleHeading } from './vehicle-copy';
import { VehicleLookup, VehicleRow, VehicleError, validVehiclePrefix } from './vehicle-data';
export interface VehiclePageData {
  prefix: string | null;
  result: VehicleLookup | null;
  items: VehicleRow[];
  related: VehicleRow[];
  status: 200 | 404 | 503;
  seo: SeoPageConfig;
}
export const vehicleResolver: ResolveFn<VehiclePageData> = async (route) => {
  const api = inject(VehicleApi),
    seo = inject(SeoService),
    locale = inject(LocaleService).locale(),
    copy = vehicleCopy(locale);
  const raw = route.paramMap.get('prefix');
  const prefix = raw && validVehiclePrefix(raw) ? raw : null;
  let result: VehicleLookup | null = null,
    items: VehicleRow[] = [],
    related: VehicleRow[] = [],
    status: VehiclePageData['status'] = 200;
  try {
    if (raw) {
      if (!prefix) throw new VehicleError(404);
      result = await api.detail(prefix);
      if (result.parsed.numericPrefix + (result.parsed.series ?? '') !== prefix) throw new VehicleError(503);
      const targets = new Set(result.allocations.map((r) => r.target.key));
      const keys = new Set(result.allocations.map((r) => r.key));
      related = (await api.related(prefix).catch(() => [])).filter(
        (r) => r.status === 'ACTIVE' && targets.has(r.target.key) && !keys.has(r.key),
      );
    } else {
      items = await api.catalogue();
      if (!items.length) throw new VehicleError(503);
    }
  } catch (e) {
    status = e instanceof VehicleError && [400, 404].includes(e.status) ? 404 : 503;
    result = null;
    items = [];
    related = [];
  }
  const title =
    status === 404
      ? copy.missing
      : status === 503
        ? copy.unavailable
        : prefix
          ? vehicleHeading(prefix, locale)
          : copy.index;
  const description =
    status === 404
      ? copy.missingBody
      : status === 503
        ? copy.unavailableBody
        : result
          ? `${result.ambiguous ? copy.ambiguous : vehicleAnswer(result.allocations[0], locale)} ${copy.disclaimer}`
          : copy.intro;
  const path = vehiclePath(locale, prefix ?? undefined);
  // Numeric pages are the indexable allocation identity. Series variants retain useful context but canonicalize to it.
  const canonical =
    result && result.parsed.series && !result.parsed.seriesAllocationVerified ? result.parsed.numericPrefix : prefix;
  const config: SeoPageConfig = {
    title,
    description,
    locale,
    status,
    breadcrumbs: [
      { label: copy.home, url: `/${locale}` },
      { label: copy.lookup },
      { label: copy.short, ...(prefix ? { url: vehiclePath(locale) } : {}) },
      ...(prefix && status === 200 ? [{ label: prefix }] : []),
    ],
    robots: { index: status === 200 && route.queryParamMap.keys.length === 0 && canonical === prefix, follow: true },
    ...(status === 200
      ? {
          canonicalPath: vehiclePath(locale, canonical ?? undefined),
          alternateLocales: supportedLocales.map((l) => ({ locale: l, path: vehiclePath(l, canonical ?? undefined) })),
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
  return { prefix, result, items, related, status, seo: config };
};
