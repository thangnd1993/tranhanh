import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { en } from './en';
import { formatDate, formatDateTime, formatNumber, formatPercent, formatTime, formatVnd } from './format';
import { LOCALE_STORAGE_KEY, LocaleService } from './locale.service';
import { equivalentPath } from './routes';
import { vi } from './vi';

describe('route-authoritative localization', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    localStorage.clear();
  });
  afterEach(() => localStorage.clear());

  it('redirects legacy entry points and preserves invalid paths for 404', async () => {
    const harness = await RouterTestingHarness.create('/');
    const router = TestBed.inject(Router);
    expect(router.url).toBe('/vi');
    for (const path of ['/fr', '/abc', '/vi/unknown']) {
      await harness.navigateByUrl(path);
      expect(router.url).toBe(path);
      expect(harness.routeNativeElement?.textContent).toContain(vi['seo.notFound.title']);
    }
    await harness.navigateByUrl('/design-system');
    expect(router.url).toBe('/vi/design-system');
  });

  it('renders each route language regardless of stored preference', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    const harness = await RouterTestingHarness.create('/vi');
    expect(harness.routeNativeElement?.textContent).toContain(vi['home.tagline']);
    expect(TestBed.inject(DOCUMENT).documentElement.lang).toBe('vi');
    localStorage.setItem(LOCALE_STORAGE_KEY, 'vi');
    await harness.navigateByUrl('/en');
    expect(harness.routeNativeElement?.textContent).toContain(en['home.tagline']);
    expect(TestBed.inject(DOCUMENT).documentElement.lang).toBe('en');
    expect(TestBed.inject(LocaleService).t('validation.required')).toBe('This field is required.');
  });

  it('switches equivalent routes, preserves query/fragment, and persists selection', async () => {
    const harness = await RouterTestingHarness.create('/vi/design-system?demo=1#forms-title');
    const service = TestBed.inject(LocaleService);
    expect(await service.switchLocale('en')).toBe(true);
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/en/design-system?demo=1#forms-title');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
    expect(harness.routeNativeElement?.textContent).toContain(en['showcase.title']);
    await harness.navigateByUrl('/vi');
    expect(service.locale()).toBe('vi');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
  });

  it('keeps translation keys in sync and maps only registered pages', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(vi).sort());
    expect(Object.values(en).every((text) => text.trim().length > 0)).toBe(true);
    expect(equivalentPath('/vi/design-system', 'en')).toBe('/en/design-system');
    expect(equivalentPath('/unknown', 'en')).toBe('/en');
  });
});

describe('presentation formatting', () => {
  const instant = new Date('2026-09-10T07:30:00Z');
  it('formats numbers, ratio percentages and VND without doing business arithmetic', () => {
    expect(formatNumber(1000000, 'vi')).toBe('1.000.000');
    expect(formatNumber(1000000, 'en')).toBe('1,000,000');
    expect(formatPercent(0.25, 'en')).toBe('25%');
    expect(formatVnd(1000000n, 'vi').replace(/\s/g, ' ')).toBe('1.000.000 ₫');
    expect(formatVnd(1000000n, 'en')).toBe('₫1,000,000');
  });
  it('uses a fixed timezone in both server and browser environments', () => {
    expect(formatDate(instant, 'vi')).toBe('10/09/2026');
    expect(formatDate(instant, 'en')).toBe('Sep 10, 2026');
    expect(formatTime(instant, 'vi')).toBe('14:30');
    expect(formatTime(instant, 'en')).toBe('2:30 PM');
    expect(formatDateTime(instant, 'en')).toBe('Sep 10, 2026 2:30 PM');
    expect(formatDate(new Date('2026-09-09T18:00:00Z'), 'vi')).toBe('10/09/2026');
  });
});
