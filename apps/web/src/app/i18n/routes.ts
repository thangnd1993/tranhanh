export const supportedLocales = ['vi', 'en'] as const;
export type Locale = (typeof supportedLocales)[number];
export const defaultLocale: Locale = 'vi';
export type PageId = 'home' | 'showcase';
export const pagePaths: Record<PageId, Record<Locale, string>> = {
  home: { vi: '/vi', en: '/en' },
  showcase: { vi: '/vi/design-system', en: '/en/design-system' },
};
export function isLocale(value: string): value is Locale {
  return supportedLocales.some((locale) => locale === value);
}
export function equivalentPath(path: string, locale: Locale): string {
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
