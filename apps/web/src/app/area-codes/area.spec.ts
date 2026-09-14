import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { LocaleService } from '../i18n/locale.service';
import { equivalentPath } from '../i18n/routes';
import { AreaApi } from './area-api.service';
import { AreaCodeResult, AreaError, isAreaResult, readArea } from './area-data';
import { AreaPageComponent } from './area-page.component';
const source = {
  publisher: 'Official telecom publisher',
  official: true,
  publisherUrl: 'https://example.test',
  title: 'Area code evidence',
  url: 'https://example.test/source',
  publishedAt: '2025-07-04T03:19:00Z',
  retrievedAt: '2026-09-11T04:35:11Z',
};
const group = { key: 'da-nang-2025', name: 'Đà Nẵng', effectiveFrom: '2025-07-01', source };
const current: AreaCodeResult = {
  code: '0236',
  currentCode: '0236',
  status: 'ACTIVE',
  locality: {
    key: 'da-nang',
    name: 'Đà Nẵng',
    aliases: ['Da Nang'],
    nameContext: 'TELECOM_SERVICE_AREA',
    source,
    group,
  },
  resolution: 'GEOGRAPHIC_AREA_CODE',
  subscriberVerified: false,
  effectiveFrom: '2017-02-11',
  effectiveTo: null,
  previousCodes: [],
  replacement: null,
  source,
  importedAt: source.retrievedAt,
  updatedAt: source.retrievedAt,
};
const migration = { oldCode: '0511', newCode: '0236', effectiveDate: '2017-02-11', source };
const legacy: AreaCodeResult = {
  ...current,
  code: '0511',
  currentCode: '0236',
  status: 'LEGACY',
  effectiveFrom: null,
  previousCodes: [],
  replacement: migration,
};
const active = { ...current, previousCodes: [migration] };
const related: AreaCodeResult = {
  ...current,
  code: '0235',
  currentCode: '0235',
  locality: { ...current.locality, key: 'quang-nam', name: 'Quảng Nam', aliases: [] },
};
const rows = [active, legacy, related];
describe('area code public pages', () => {
  const api = {
    catalogue: vi.fn(async () => rows),
    detail: vi.fn(async (code: string) => {
      const row = rows.find((r) => r.code === code);
      if (!row) throw new AreaError(404);
      return row;
    }),
    related: vi.fn(async () => [related]),
    lookup: vi.fn(async () => active),
    search: vi.fn(async () => ({ items: [active, related], total: 2, page: 1, pageSize: 20 })),
  };
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [provideRouter(routes), { provide: AreaApi, useValue: api }] });
  });
  it('renders a grouped API-driven index with legacy links', async () => {
    const h = await RouterTestingHarness.create('/vi/tra-cuu/ma-vung');
    expect(h.routeNativeElement?.querySelector('h1')?.textContent).toBe('Tra cứu mã vùng điện thoại Việt Nam');
    expect(h.routeNativeElement?.querySelector('a[href="/vi/tra-cuu/ma-vung/0511"]')).not.toBeNull();
  });
  it('renders a sourced current answer and historical link', async () => {
    const h = await RouterTestingHarness.create('/vi/tra-cuu/ma-vung/0236');
    const text = h.routeNativeElement?.textContent;
    expect(text).toContain('Mã vùng 0236 được sử dụng cho khu vực Đà Nẵng.');
    expect(text).toContain('Official telecom publisher');
    expect(text).toContain('Ngày đối chiếu nguồn');
    expect(h.routeNativeElement?.querySelector('a[href="/vi/tra-cuu/ma-vung/0511"]')).not.toBeNull();
    expect(h.routeNativeElement?.querySelectorAll('h1').length).toBe(1);
  });
  it('keeps a legacy route and its historical context', async () => {
    const h = await RouterTestingHarness.create('/vi/tra-cuu/ma-vung/0511');
    expect(TestBed.inject(Router).url).toBe('/vi/tra-cuu/ma-vung/0511');
    expect(h.routeNativeElement?.textContent).toContain('Mã vùng cũ 0511 của khu vực Đà Nẵng đã đổi thành 0236.');
    expect(h.routeNativeElement?.textContent).toContain('11 thg 2, 2017');
  });
  it('switches the equivalent current and legacy route to natural English', async () => {
    const h = await RouterTestingHarness.create('/vi/tra-cuu/ma-vung/0511');
    await TestBed.inject(LocaleService).switchLocale('en');
    h.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/en/lookup/area-code/0511');
    expect(h.routeNativeElement?.textContent).toContain('Legacy area code 0511 for Đà Nẵng changed to 0236.');
    expect(equivalentPath('/vi/tra-cuu/ma-vung/0236', 'en')).toBe('/en/lookup/area-code/0236');
  });
  it('shows multiple locality matches without arbitrary navigation', async () => {
    const h = await RouterTestingHarness.create('/vi/tra-cuu/ma-vung');
    const component = h.fixture.debugElement.query((e) => e.componentInstance instanceof AreaPageComponent)
      .componentInstance as AreaPageComponent;
    const input = h.routeNativeElement!.querySelector('input')!;
    input.value = 'miền Trung';
    await component.search(new Event('submit'), input);
    h.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/vi/tra-cuu/ma-vung');
    expect(h.routeNativeElement?.textContent).toContain('Kết quả phù hợp');
    expect(h.routeNativeElement?.textContent).toContain('Quảng Nam');
  });
  it('prefers an exact normalized locality over broader group matches', async () => {
    const h = await RouterTestingHarness.create('/vi/tra-cuu/ma-vung');
    const component = h.fixture.debugElement.query((e) => e.componentInstance instanceof AreaPageComponent)
      .componentInstance as AreaPageComponent;
    const input = h.routeNativeElement!.querySelector('input')!;
    input.value = 'Da Nang';
    await component.search(new Event('submit'), input);
    h.detectChanges();
    expect(h.routeNativeElement?.textContent).toContain('Đà Nẵng');
    expect(h.routeNativeElement?.querySelector('.search-results')?.textContent).not.toContain('Quảng Nam');
  });
  it('clears a full number and navigates only to the canonical code', async () => {
    const h = await RouterTestingHarness.create('/vi/tra-cuu/ma-vung');
    const component = h.fixture.debugElement.query((e) => e.componentInstance instanceof AreaPageComponent)
      .componentInstance as AreaPageComponent;
    const input = h.routeNativeElement!.querySelector('input')!;
    input.value = '+84' + '236' + '1234567';
    await component.search(new Event('submit'), input);
    expect(input.value).toBe('');
    expect(TestBed.inject(Router).url).toBe('/vi/tra-cuu/ma-vung/0236');
  });
  it('separates malformed, unknown and unavailable detail states', async () => {
    const h = await RouterTestingHarness.create('/vi/tra-cuu/ma-vung/abc');
    expect(api.detail).not.toHaveBeenCalledWith('abc');
    expect(h.routeNativeElement?.textContent).toContain('Không tìm thấy mã vùng');
    api.detail.mockRejectedValueOnce(new AreaError(503));
    await h.navigateByUrl('/en/lookup/area-code/0236');
    expect(h.routeNativeElement?.textContent).toContain('temporarily unavailable');
  });
  it('associates localized search errors with the control', async () => {
    const h = await RouterTestingHarness.create('/vi/tra-cuu/ma-vung');
    const component = h.fixture.debugElement.query((e) => e.componentInstance instanceof AreaPageComponent)
      .componentInstance as AreaPageComponent;
    const input = h.routeNativeElement!.querySelector('input')!;
    api.lookup.mockRejectedValueOnce(new AreaError(400));
    input.value = '999';
    await component.search(new Event('submit'), input);
    h.detectChanges();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('area-search-message');
  });
});
describe('area API boundary', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('rejects unsafe or semantically malformed records', () => {
    expect(isAreaResult(active)).toBe(true);
    expect(isAreaResult({ ...active, source: { ...source, url: 'javascript:alert(1)' } })).toBe(false);
    expect(isAreaResult({ ...active, subscriberVerified: true })).toBe(false);
    expect(isAreaResult({ ...legacy, replacement: null })).toBe(false);
  });
  it('maps malformed responses and transport failures to safe unavailability', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
    await expect(readArea('', '/0236', isAreaResult)).rejects.toMatchObject({ status: 503 });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Timed out', 'TimeoutError')));
    await expect(readArea('', '/0236', isAreaResult)).rejects.toMatchObject({ status: 503 });
  });
});
