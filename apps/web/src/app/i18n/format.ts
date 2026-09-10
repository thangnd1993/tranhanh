import { Locale } from './routes';
const intlLocales: Record<Locale, string> = { vi: 'vi-VN', en: 'en-US' };
export function formatNumber(value: number | bigint, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(intlLocales[locale], options).format(value);
}
/** Presentation only: callers own arithmetic and business rounding rules. */
export function formatVnd(value: number | bigint, locale: Locale): string {
  return formatNumber(value, locale, { style: 'currency', currency: 'VND' });
}
/** A ratio of 0.25 is displayed as 25%. */
export function formatPercent(value: number, locale: Locale): string {
  return formatNumber(value, locale, { style: 'percent', maximumFractionDigits: 2 });
}
/** Explicit timezone keeps server and browser output identical. Pass an instant, never an ambiguous date string. */
export function formatDate(value: Date | number, locale: Locale, timeZone = 'Asia/Ho_Chi_Minh'): string {
  return new Intl.DateTimeFormat(intlLocales[locale], {
    timeZone,
    year: 'numeric',
    month: locale === 'vi' ? '2-digit' : 'short',
    day: locale === 'vi' ? '2-digit' : 'numeric',
  }).format(value);
}
export function formatTime(value: Date | number, locale: Locale, timeZone = 'Asia/Ho_Chi_Minh'): string {
  return new Intl.DateTimeFormat(intlLocales[locale], {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: locale === 'en',
  }).format(value);
}
export function formatDateTime(value: Date | number, locale: Locale, timeZone = 'Asia/Ho_Chi_Minh'): string {
  return `${formatDate(value, locale, timeZone)} ${formatTime(value, locale, timeZone)}`;
}
