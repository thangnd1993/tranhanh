import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { TrafficFineLookupRequest, TrafficFineLookupResponse } from '@tranhanh/shared';
import { routes } from '../app.routes';
import { PUBLIC_SITE_CONFIG } from '../seo/seo.service';
import { TrafficFineApi } from './traffic-fine-api.service';
import { TrafficFineApiError, isTrafficFineLookupResponse } from './traffic-fine-data';
import { TrafficFinePageComponent } from './traffic-fine-page.component';

const provider = {
  key: 'csgt-manual',
  name: 'Cục Cảnh sát giao thông — tra cứu vi phạm qua hình ảnh',
  official: true,
  url: 'https://official.example.test/lookup',
  automation: 'MANUAL_ONLY' as const,
  status: 'DISABLED' as const,
  geographicCoverage: 'Vietnam; coverage is not guaranteed.',
  supportedVehicleTypes: ['CAR', 'MOTORCYCLE', 'ELECTRIC_BICYCLE'] as const,
  requiresCaptcha: true,
  requiresAuthentication: false,
  freshness: 'No machine-readable freshness guarantee.',
};
const response = (outcome: TrafficFineLookupResponse['outcome']): TrafficFineLookupResponse => ({
  outcome,
  queriedPlateMasked: '99Z-***.00',
  vehicleType: 'CAR',
  provider: { ...provider, supportedVehicleTypes: [...provider.supportedVehicleTypes] },
  retrievedAt: '2026-09-16T08:00:00Z',
  limitations: [{ code: 'CAPTCHA_REQUIRED', message: 'Raw provider wording is not presented.' }],
  results:
    outcome === 'RESULTS_AVAILABLE'
      ? [
          {
            fingerprint: 'a'.repeat(64),
            providerKey: provider.key,
            sourceUrl: provider.url,
            violationTime: '2026-09-15T08:00:00+07:00',
            violationLocation: 'Synthetic test location',
            violationBehavior: 'Synthetic test behavior',
            detectingAuthority: 'Synthetic detecting authority',
            processingAuthority: null,
            status: 'UNKNOWN',
            providerStatusText: null,
            sourceUpdatedAt: null,
            publicReference: 'TEST-REFERENCE',
          },
        ]
      : [],
});

describe('traffic fine frontend', () => {
  const api = { lookup: vi.fn<TrafficFineApi['lookup']>(async () => response('MANUAL_VERIFICATION_REQUIRED')) };
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: TrafficFineApi, useValue: api },
        { provide: PUBLIC_SITE_CONFIG, useValue: { origin: 'https://site.example.test', allowIndexing: true } },
      ],
    });
  });
  async function page(path = '/vi/tra-cuu/phat-nguoi') {
    const harness = await RouterTestingHarness.create(path);
    const component = harness.fixture.debugElement.query(
      (element) => element.componentInstance instanceof TrafficFinePageComponent,
    ).componentInstance as TrafficFinePageComponent;
    return { harness, component };
  }
  async function submit(component: TrafficFinePageComponent, root: HTMLElement, plate = '89Y-111.11') {
    const input = root.querySelector<HTMLInputElement>('#traffic-fine-plate')!;
    const select = root.querySelector<HTMLSelectElement>('#traffic-fine-vehicle-type')!;
    input.value = plate;
    await component.submit(new Event('submit'), input, select);
    TestBed.flushEffects();
    return input;
  }
  it('renders useful static Vietnamese and English content with an official external CTA', async () => {
    const current = await page();
    expect(current.harness.routeNativeElement?.textContent).toContain('Tra cứu phạt nguội');
    const official = current.harness.routeNativeElement?.querySelector<HTMLAnchorElement>('a[target="_blank"]');
    expect(official?.rel).toContain('noopener');
    expect(official?.href).toContain('csgt.vn');
    await current.harness.navigateByUrl('/en/lookup/traffic-fines');
    expect(current.harness.routeNativeElement?.textContent).toContain('CAPTCHA verification');
  });
  it('submits a valid plate by POST client contract, clears it, keeps a static URL, and renders manual status', async () => {
    const { harness, component } = await page();
    const input = await submit(component, harness.routeNativeElement!);
    harness.fixture.detectChanges();
    expect(api.lookup).toHaveBeenCalledWith(
      { licensePlate: '89Y-111.11', vehicleType: 'CAR' },
      expect.any(AbortSignal),
    );
    expect(input.value).toBe('');
    expect(TestBed.inject(Router).url).toBe('/vi/tra-cuu/phat-nguoi');
    expect(harness.routeNativeElement?.textContent).toContain('Cần xác minh thủ công');
    expect(harness.routeNativeElement?.textContent).not.toContain('89Y-111.11');
  });
  it.each([
    ['UNSUPPORTED', 'Loại phương tiện chưa được nguồn này hỗ trợ'],
    ['NO_MATCHING_RECORDS', 'Nguồn không trả về bản ghi phù hợp'],
    ['SOURCE_UNAVAILABLE', 'Nguồn tra cứu hiện không phản hồi'],
  ] as const)('renders %s without inventing a stronger conclusion', async (outcome, expected) => {
    api.lookup.mockResolvedValueOnce(response(outcome));
    const { harness, component } = await page();
    await submit(component, harness.routeNativeElement!);
    harness.fixture.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain(expected);
    expect(harness.routeNativeElement?.textContent).not.toContain('Xe không có phạt nguội');
  });
  it('cancels a stale request before accepting a later submission', async () => {
    let firstSignal: AbortSignal | undefined;
    api.lookup
      .mockImplementationOnce(
        (_input: TrafficFineLookupRequest, signal?: AbortSignal): Promise<TrafficFineLookupResponse> =>
          new Promise<TrafficFineLookupResponse>((_resolve, reject) => {
            firstSignal = signal;
            signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          }),
      )
      .mockResolvedValueOnce(response('MANUAL_VERIFICATION_REQUIRED'));
    const { harness, component } = await page();
    const input = harness.routeNativeElement!.querySelector<HTMLInputElement>('#traffic-fine-plate')!;
    const select = harness.routeNativeElement!.querySelector<HTMLSelectElement>('#traffic-fine-vehicle-type')!;
    input.value = '88Y-111.11';
    const first = component.submit(new Event('submit'), input, select);
    input.value = '89Y-111.11';
    const second = component.submit(new Event('submit'), input, select);
    await Promise.all([first, second]);
    expect(firstSignal).toBeDefined();
    expect(firstSignal!.aborted).toBe(true);
    expect(component.response()?.outcome).toBe('MANUAL_VERIFICATION_REQUIRED');
  });
  it('renders only provided fields for future normalized results', async () => {
    api.lookup.mockResolvedValueOnce(response('RESULTS_AVAILABLE'));
    const { harness, component } = await page();
    await submit(component, harness.routeNativeElement!);
    harness.fixture.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Synthetic test location');
    expect(harness.routeNativeElement?.textContent).toContain('TEST-REFERENCE');
    expect(harness.routeNativeElement?.textContent).not.toContain('Mức phạt');
  });
  it.each([
    [400, 'chưa hợp lệ'],
    [429, 'quá nhiều lượt'],
    [503, 'không phản hồi'],
  ])('maps HTTP %s to safe localized feedback', async (status, expected) => {
    api.lookup.mockRejectedValueOnce(new TrafficFineApiError(status));
    const { harness, component } = await page();
    await submit(component, harness.routeNativeElement!);
    harness.fixture.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain(expected);
  });
  it('keeps SEO static and excludes a submitted plate from metadata and structured data', async () => {
    const { harness, component } = await page();
    await submit(component, harness.routeNativeElement!);
    harness.fixture.detectChanges();
    const document = TestBed.inject(DOCUMENT);
    const metadata = [
      document.title,
      document.querySelector('meta[name="description"]')?.getAttribute('content'),
      document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      ...[...document.querySelectorAll('link[hreflang], script[type="application/ld+json"]')].map(
        (node) => node.outerHTML,
      ),
    ].join(' ');
    expect(metadata).not.toContain('89Y-111.11');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://site.example.test/vi/tra-cuu/phat-nguoi',
    );
  });
  it('validates trusted response URLs and masked response shape', () => {
    expect(isTrafficFineLookupResponse(response('MANUAL_VERIFICATION_REQUIRED'))).toBe(true);
    expect(
      isTrafficFineLookupResponse({
        ...response('MANUAL_VERIFICATION_REQUIRED'),
        provider: { ...provider, url: 'javascript:alert(1)' },
      }),
    ).toBe(false);
    expect(
      isTrafficFineLookupResponse({ ...response('MANUAL_VERIFICATION_REQUIRED'), queriedPlateMasked: '99Z00000' }),
    ).toBe(false);
  });
});
