export const supportedLocales = ['vi', 'en'] as const;
export type Locale = (typeof supportedLocales)[number];
export const defaultLocale: Locale = 'vi';
export type PageId =
  | 'home'
  | 'trafficFine'
  | 'fuelPrices'
  | 'showcase'
  | 'login'
  | 'register'
  | 'account'
  | 'garage'
  | 'forgotPassword'
  | 'resetPassword';
export const pagePaths: Record<PageId, Record<Locale, string>> = {
  home: { vi: '/vi', en: '/en' },
  trafficFine: { vi: '/vi/tra-cuu/phat-nguoi', en: '/en/lookup/traffic-fines' },
  fuelPrices: { vi: '/vi/gia-xang', en: '/en/fuel-prices' },
  showcase: { vi: '/vi/design-system', en: '/en/design-system' },
  login: { vi: '/vi/dang-nhap', en: '/en/login' },
  register: { vi: '/vi/dang-ky', en: '/en/register' },
  account: { vi: '/vi/tai-khoan', en: '/en/account' },
  garage: { vi: '/vi/garage', en: '/en/garage' },
  forgotPassword: { vi: '/vi/quen-mat-khau', en: '/en/forgot-password' },
  resetPassword: { vi: '/vi/dat-lai-mat-khau', en: '/en/reset-password' },
};
export function isLocale(value: string): value is Locale {
  return supportedLocales.some((locale) => locale === value);
}
export function equivalentPath(path: string, locale: Locale): string {
  for (const source of supportedLocales) {
    const base = garagePath(source);
    const clean = path.replace(/\/$/, '');
    const match = clean
      .slice(base.length + 1)
      .match(/^([0-9a-f-]{36})\/(giay-to|documents)(?:\/(them|add|[0-9a-f-]{36})(?:\/(chinh-sua|edit))?)?$/i);
    if (clean.startsWith(base + '/') && match) {
      const vehicleId = match[1];
      if (!match[3]) return documentPath(locale, vehicleId);
      if (match[3] === 'them' || match[3] === 'add') return documentPath(locale, vehicleId, undefined, 'add');
      return documentPath(locale, vehicleId, match[3], match[4] ? 'edit' : undefined);
    }
  }
  for (const source of supportedLocales) {
    const base = garagePath(source);
    const clean = path.replace(/\/$/, '');
    if (clean === base) return garagePath(locale);
    const suffix = clean.slice(base.length + 1);
    if (clean.startsWith(base + '/') && suffix === (source === 'vi' ? 'them-xe' : 'add'))
      return garagePath(locale, undefined, 'add');
    const match = suffix.match(/^([0-9a-f-]{36})(?:\/(chinh-sua|edit))?$/i);
    if (clean.startsWith(base + '/') && match) return garagePath(locale, match[1], match[2] ? 'edit' : undefined);
  }
  for (const source of supportedLocales) {
    const base = vehiclePath(source);
    const clean = path.replace(/\/$/, '');
    if (clean === base) return vehiclePath(locale);
    if (clean.startsWith(base + '/') && /^[1-9]\d(?:[A-Z][A-Z0-9]?)?$/.test(clean.slice(base.length + 1)))
      return vehiclePath(locale, clean.slice(base.length + 1));
  }
  for (const source of supportedLocales) {
    const base = areaPath(source);
    const clean = path.replace(/\/$/, '');
    if (clean === base) return areaPath(locale);
    if (clean.startsWith(base + '/') && /^0[1-9]\d{0,2}$/.test(clean.slice(base.length + 1)))
      return areaPath(locale, clean.slice(base.length + 1));
  }
  for (const source of supportedLocales) {
    const base = phonePath(source);
    const clean = path.replace(/\/$/, '');
    if (clean === base) return phonePath(locale);
    if (clean.startsWith(base + '/') && /^\d{3,4}$/.test(clean.slice(base.length + 1)))
      return phonePath(locale, clean.slice(base.length + 1));
  }
  const page = (Object.keys(pagePaths) as PageId[]).find((id) =>
    supportedLocales.some((source) => pagePaths[id][source] === path.replace(/\/$/, '')),
  );
  return pagePaths[page ?? 'home'][locale];
}
export function phonePath(locale: Locale, prefix?: string): string {
  const base = locale === 'vi' ? '/vi/tra-cuu/dau-so' : '/en/lookup/phone-prefix';
  return prefix ? `${base}/${prefix}` : base;
}
export function areaPath(locale: Locale, code?: string): string {
  const base = locale === 'vi' ? '/vi/tra-cuu/ma-vung' : '/en/lookup/area-code';
  return code ? `${base}/${code}` : base;
}

export function fuelPricePath(locale: Locale): string {
  return pagePaths.fuelPrices[locale];
}

export function trafficFinePath(locale: Locale): string {
  return pagePaths.trafficFine[locale];
}

export function vehiclePath(locale: Locale, prefix?: string): string {
  const base = locale === 'vi' ? '/vi/tra-cuu/bien-so' : '/en/lookup/vehicle-plate';
  return prefix ? `${base}/${prefix}` : base;
}

export function garagePath(locale: Locale, id?: string, action?: 'add' | 'edit'): string {
  const base = pagePaths.garage[locale];
  if (action === 'add') return `${base}/${locale === 'vi' ? 'them-xe' : 'add'}`;
  if (!id) return base;
  return action === 'edit' ? `${base}/${id}/${locale === 'vi' ? 'chinh-sua' : 'edit'}` : `${base}/${id}`;
}

export function documentPath(locale: Locale, vehicleId: string, documentId?: string, action?: 'add' | 'edit'): string {
  const base = `${garagePath(locale, vehicleId)}/${locale === 'vi' ? 'giay-to' : 'documents'}`;
  if (action === 'add') return `${base}/${locale === 'vi' ? 'them' : 'add'}`;
  if (!documentId) return base;
  return action === 'edit'
    ? `${base}/${documentId}/${locale === 'vi' ? 'chinh-sua' : 'edit'}`
    : `${base}/${documentId}`;
}
