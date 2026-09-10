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
  const page = (Object.keys(pagePaths) as PageId[]).find((id) =>
    supportedLocales.some((source) => pagePaths[id][source] === path.replace(/\/$/, '')),
  );
  return pagePaths[page ?? 'home'][locale];
}
