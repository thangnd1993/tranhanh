import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { LocaleService } from '../i18n/locale.service';
import { equivalentPath } from '../i18n/routes';
import { PhoneApi } from './phone-api.service';
import { isPhoneResult, PhoneError, PhonePrefixResult, readPhone } from './phone-data';
import { PhonePageComponent } from './phone-page.component';

const source = {
  publisher: 'Test official publisher',
  official: true,
  publisherUrl: 'https://example.test',
  title: 'Allocation evidence',
  url: 'https://example.test/source',
  publishedAt: null,
  retrievedAt: '2026-09-01T00:00:00Z',
};
const current: PhonePrefixResult = {
  prefix: '086',
  currentPrefix: '086',
  status: 'ACTIVE',
  operator: { key: 'viettel', name: 'Viettel', website: null },
  operatorResolution: 'PREFIX_ALLOCATION',
  currentSubscriberNetworkVerified: false,
  effectiveFrom: null,
  effectiveTo: null,
  previousPrefixes: [],
  replacement: null,
  source,
  importedAt: source.retrievedAt,
  updatedAt: source.retrievedAt,
};
const replacement = { oldPrefix: '0168', newPrefix: '038', effectiveAt: null, source };
const legacy: PhonePrefixResult = { ...current, prefix: '0168', currentPrefix: '038', status: 'LEGACY', replacement };
const related = { ...current, prefix: '038', currentPrefix: '038', previousPrefixes: [replacement] };
const rows = [current, legacy, related];

describe('phone prefix public pages', () => {
  const api = {
    catalogue: vi.fn(async () => rows),
    detail: vi.fn(async (prefix: string) => {
      const row = rows.find((r) => r.prefix === prefix);
      if (!row) throw new PhoneError(404);
      return row;
    }),
    related: vi.fn(async () => [related]),
    lookup: vi.fn(async () => current),
  };
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [provideRouter(routes), { provide: PhoneApi, useValue: api }] });
  });
  it('renders an API-driven grouped index and legacy links', async () => {
    const h = await RouterTestingHarness.create('/vi/tra-cuu/dau-so');
    expect(h.routeNativeElement?.querySelector('h1')?.textContent).toBe('Tra cứu đầu số điện thoại Việt Nam');
    expect(h.routeNativeElement?.querySelector('a[href="/vi/tra-cuu/dau-so/0168"]')).not.toBeNull();
    expect(h.routeNativeElement?.textContent).toContain('Viettel');
  });
  it('does not index an empty catalogue before the database import', async () => {
    api.catalogue.mockResolvedValueOnce([]);
    const h = await RouterTestingHarness.create('/vi/tra-cuu/dau-so');
    expect(h.routeNativeElement?.textContent).toContain('Dữ liệu tạm thời chưa khả dụng');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
  });
  it('renders accurate allocation, MNP, evidence, date labels and related links', async () => {
    const h = await RouterTestingHarness.create('/vi/tra-cuu/dau-so/086');
    const text = h.routeNativeElement?.textContent;
    expect(text).toContain('Đầu số 086 được phân bổ cho Viettel.');
    expect(text).toContain('chuyển mạng giữ số');
    expect(text).toContain('Test official publisher');
    expect(text).toContain('Ngày đối chiếu nguồn');
    expect(text).not.toContain('Ngày xuất bản');
    expect(h.routeNativeElement?.querySelectorAll('h1').length).toBe(1);
    expect(h.routeNativeElement?.querySelector('a[href="/vi/tra-cuu/dau-so/038"]')).not.toBeNull();
  });
  it('renders legacy status, replacement link and no invented migration date', async () => {
    const h = await RouterTestingHarness.create('/vi/tra-cuu/dau-so/0168');
    expect(h.routeNativeElement?.textContent).toContain('Đầu số 0168 đã được chuyển thành 038.');
    expect(h.routeNativeElement?.textContent).toContain('Nguồn chưa xác định ngày chuyển đổi');
    expect(h.routeNativeElement?.querySelector('.answer-card')?.textContent).not.toContain('Đang sử dụng');
  });
  it('switches detail and legacy routes to equivalent English content', async () => {
    const h = await RouterTestingHarness.create('/vi/tra-cuu/dau-so/086');
    await TestBed.inject(LocaleService).switchLocale('en');
    h.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/en/lookup/phone-prefix/086');
    expect(h.routeNativeElement?.textContent).toContain('Prefix 086 is allocated to Viettel.');
    expect(equivalentPath('/vi/tra-cuu/dau-so/0168', 'en')).toBe('/en/lookup/phone-prefix/0168');
    await h.navigateByUrl('/en/lookup/phone-prefix/0168');
    expect(h.routeNativeElement?.textContent).toContain('Prefix 0168 was changed to 038.');
  });
  it('separates unknown and invalid paths from temporary API failure', async () => {
    const h = await RouterTestingHarness.create('/vi/tra-cuu/dau-so/999');
    expect(h.routeNativeElement?.textContent).toContain('Không tìm thấy đầu số');
    await h.navigateByUrl('/vi/tra-cuu/dau-so/abc');
    expect(api.detail).not.toHaveBeenCalledWith('abc');
    api.detail.mockRejectedValueOnce(new PhoneError(503));
    await h.navigateByUrl('/en/lookup/phone-prefix/086');
    expect(h.routeNativeElement?.textContent).toContain('Prefix data is temporarily unavailable');
  });
  it('clears subscriber input, uses backend normalization and navigates only to prefix', async () => {
    const h = await RouterTestingHarness.create('/vi/tra-cuu/dau-so');
    const element = h.routeNativeElement!;
    const component = h.fixture.debugElement.query((e) => e.componentInstance instanceof PhonePageComponent)
      .componentInstance as PhonePageComponent;
    const input = element.querySelector('input')!;
    input.value = '+84' + '861234567';
    await component.search(new Event('submit'), input);
    expect(input.value).toBe('');
    expect(TestBed.inject(Router).url).toBe('/vi/tra-cuu/dau-so/086');
  });
  it('associates localized validation, unknown-search and unavailable errors with input', async () => {
    const h = await RouterTestingHarness.create('/vi/tra-cuu/dau-so');
    const component = h.fixture.debugElement.query((e) => e.componentInstance instanceof PhonePageComponent)
      .componentInstance as PhonePageComponent;
    const input = h.routeNativeElement!.querySelector('input')!;
    for (const [status, text] of [
      [400, 'Định dạng chưa hợp lệ'],
      [404, 'Kiểm tra lại đầu số'],
      [503, 'Chưa thể kết nối'],
    ] as const) {
      api.lookup.mockRejectedValueOnce(new PhoneError(status));
      input.value = '999';
      await component.search(new Event('submit'), input);
      h.detectChanges();
      expect(h.routeNativeElement?.textContent).toContain(text);
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toBe('phone-search-message');
    }
  });
});
describe('phone API boundary', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('rejects malformed result, unsafe source links and unverified semantics', () => {
    expect(isPhoneResult(current)).toBe(true);
    expect(isPhoneResult({ ...current, source: { ...source, url: 'javascript:alert(1)' } })).toBe(false);
    expect(isPhoneResult({ ...current, currentSubscriberNetworkVerified: true })).toBe(false);
    expect(isPhoneResult({ ...legacy, replacement: null })).toBe(false);
    expect(isPhoneResult({ ...current, updatedAt: 'invalid' })).toBe(false);
  });
  it('turns malformed responses and timeouts into safe unavailability', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
    await expect(readPhone('', '/086', isPhoneResult)).rejects.toMatchObject({ status: 503 });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Timed out', 'TimeoutError')));
    await expect(readPhone('', '/086', isPhoneResult)).rejects.toMatchObject({ status: 503 });
  });
});
