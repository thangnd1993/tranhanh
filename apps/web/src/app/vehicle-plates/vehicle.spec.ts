import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { VehicleApi } from './vehicle-api.service';
import { VehicleError, VehicleRow, isVehicleLookup } from './vehicle-data';
import { VehiclePageComponent } from './vehicle-page.component';
import { equivalentPath } from '../i18n/routes';
const source = {
  publisher: 'Test publisher',
  official: false,
  publisherUrl: 'https://example.test',
  title: 'Test evidence',
  url: 'https://example.test/evidence',
  publishedAt: null,
  retrievedAt: '2026-09-15T02:21:09Z',
};
const row: VehicleRow = {
  key: '51-current',
  numericPrefix: '51',
  seriesPrefix: null,
  status: 'ACTIVE',
  target: {
    key: 'ho-chi-minh',
    name: 'TP. Hồ Chí Minh',
    aliases: [],
    type: 'LOCALITY',
    nameContext: 'VEHICLE_PLATE_ALLOCATION',
    source,
  },
  effectiveFrom: '2025-07-01',
  effectiveTo: null,
  previousTargets: [],
  source,
  importedAt: source.retrievedAt,
  updatedAt: source.retrievedAt,
};
const lookup = (series: string | null = null) => ({
  parsed: { numericPrefix: '51', series, seriesAllocationVerified: false },
  resolution: 'NUMERIC_PREFIX_ALLOCATION' as const,
  allocations: [row],
  ambiguous: false,
  vehicleOrOwnerVerified: false as const,
});
describe('vehicle frontend', () => {
  const api = {
    catalogue: vi.fn(async () => [row]),
    detail: vi.fn(async (p: string) => {
      if (!p.startsWith('51')) throw new VehicleError(404);
      return lookup(p.slice(2) || null);
    }),
    related: vi.fn(async () => []),
    lookup: vi.fn(async () => lookup('K')),
    search: vi.fn(async () => ({ items: [row], total: 1, page: 1, pageSize: 20 })),
  };
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [provideRouter(routes), { provide: VehicleApi, useValue: api }] });
  });
  it('renders grouped catalogue links', async () => {
    const h = await RouterTestingHarness.create('/vi/tra-cuu/bien-so');
    expect(h.routeNativeElement?.querySelector('a[href="/vi/tra-cuu/bien-so/51"]')).not.toBeNull();
  });
  it('renders series scope and sourced numeric answer', async () => {
    const h = await RouterTestingHarness.create('/vi/tra-cuu/bien-so/51K');
    expect(h.routeNativeElement?.textContent).toContain('Mã biển số 51 được phân bổ cho TP. Hồ Chí Minh.');
    expect(h.routeNativeElement?.textContent).toContain('Seri đi kèm');
    expect(h.routeNativeElement?.textContent).toContain('Test publisher');
  });
  it('preserves English equivalent routes', async () => {
    const h = await RouterTestingHarness.create('/en/lookup/vehicle-plate/51');
    expect(h.routeNativeElement?.textContent).toContain('Plate prefix 51 is allocated');
    expect(equivalentPath('/vi/tra-cuu/bien-so/51K', 'en')).toBe('/en/lookup/vehicle-plate/51K');
  });
  it('clears serial and navigates to prefix only', async () => {
    const h = await RouterTestingHarness.create('/vi/tra-cuu/bien-so');
    const c = h.fixture.debugElement.query((e) => e.componentInstance instanceof VehiclePageComponent)
      .componentInstance as VehiclePageComponent;
    const input = h.routeNativeElement!.querySelector('input')!;
    input.value = '51K-123.45';
    await c.search(new Event('submit'), input);
    expect(input.value).toBe('');
    expect(TestBed.inject(Router).url).toBe('/vi/tra-cuu/bien-so/51K');
  });
  it('rejects full plate routes before API access', async () => {
    const h = await RouterTestingHarness.create('/vi/tra-cuu/bien-so/51K-123.45');
    expect(h.routeNativeElement?.textContent).toContain('Không tìm thấy mã biển số');
    expect(api.detail).not.toHaveBeenCalled();
  });
  it('treats empty data as unavailable', async () => {
    api.catalogue.mockResolvedValueOnce([]);
    const h = await RouterTestingHarness.create('/vi/tra-cuu/bien-so');
    expect(h.routeNativeElement?.textContent).toContain('tạm thời chưa khả dụng');
  });
  it('renders every matching allocation without choosing a winner', async () => {
    api.detail.mockResolvedValueOnce({
      ...lookup(),
      ambiguous: true,
      allocations: [
        row,
        {
          ...row,
          key: '51-k',
          seriesPrefix: 'K',
          target: { ...row.target, key: 'test-target', name: 'Synthetic other target' },
        },
      ],
    });
    const h = await RouterTestingHarness.create('/vi/tra-cuu/bien-so/51');
    expect(h.routeNativeElement?.textContent).toContain('Có nhiều phân bổ phù hợp');
    expect(h.routeNativeElement?.querySelectorAll('tn-vehicle-result').length).toBe(2);
    expect(h.routeNativeElement?.textContent).toContain('Synthetic other target');
  });
  it('validates ambiguity and source URLs', () => {
    expect(isVehicleLookup(lookup())).toBe(true);
    expect(isVehicleLookup({ ...lookup(), ambiguous: true })).toBe(false);
    expect(
      isVehicleLookup({ ...lookup(), allocations: [{ ...row, source: { ...source, url: 'javascript:bad' } }] }),
    ).toBe(false);
  });
});
