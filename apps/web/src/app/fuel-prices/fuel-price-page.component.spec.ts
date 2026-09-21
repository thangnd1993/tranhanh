import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import type { FuelPriceCurrent } from '@tranhanh/shared';
import { LocaleService } from '../i18n/locale.service';
import { FuelPricePageComponent } from './fuel-price-page.component';
const base: FuelPriceCurrent = {
  id: 'current-e5',
  productKey: 'e5-ron-92',
  officialName: 'Xăng E5RON92',
  price: '25139',
  unit: 'VND_PER_LITER',
  semantics: 'MAXIMUM_RETAIL_PRICE',
  previousPrice: '23744',
  changeAmount: '1395',
  changeDirection: 'INCREASE',
  changePercentage: '5.88',
  effectiveFrom: '2026-09-17T08:00:00.000Z',
  publishedAt: '2026-09-17T07:59:00.000Z',
  retrievedAt: '2026-09-21T01:30:00.000Z',
  source: {
    publisher: 'Bộ Công Thương',
    official: true,
    title: 'Thông báo chính thức',
    url: 'https://minhbach.moit.gov.vn/test',
    publicationNumber: '7458/BCT-TTTN',
  },
};
async function render(data: unknown) {
  await TestBed.configureTestingModule({
    imports: [FuelPricePageComponent],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { data: { fuel: data } } } },
      { provide: LocaleService, useValue: { locale: () => 'vi', t: (key: string) => key, path: () => '/vi' } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(FuelPricePageComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}
describe('FuelPricePageComponent', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('renders database-backed current price, source, history and non-color change text', async () => {
    const element = await render({
      current: {
        items: [
          base,
          {
            ...base,
            id: 'down',
            productKey: 'diesel-0-05s',
            changeAmount: '-100',
            changeDirection: 'DECREASE',
            changePercentage: '-0.33',
          },
          {
            ...base,
            id: 'same',
            productKey: 'e10-ron-95-iii',
            changeAmount: '0',
            changeDirection: 'UNCHANGED',
            changePercentage: '0.00',
          },
        ],
        retrievedAt: base.retrievedAt,
        stale: false,
        degraded: false,
        staleAfter: '2026-09-27T08:00:00Z',
      },
      history: { items: [base], page: 1, pageSize: 20, total: 1 },
      unavailable: false,
    });
    expect(element.querySelector('h1')?.textContent).toContain('Giá xăng hôm nay');
    expect(element.textContent).toContain('25.139');
    expect(element.textContent).toContain('Tăng');
    expect(element.textContent).toContain('Giảm');
    expect(element.textContent).toContain('Không đổi');
    expect(element.textContent).toContain('Bộ Công Thương');
    expect(element.querySelector('table')).toBeTruthy();
  });
  it('renders honest unavailable and no-data states without zero prices', async () => {
    let element = await render({ current: null, history: null, unavailable: true });
    expect(element.textContent).toContain('tạm thời không khả dụng');
    TestBed.resetTestingModule();
    element = await render({
      current: { items: [], retrievedAt: null, stale: true, degraded: false, staleAfter: null },
      history: { items: [], page: 1, pageSize: 20, total: 0 },
      unavailable: false,
    });
    expect(element.textContent).toContain('Chưa có dữ liệu');
    expect(element.textContent).not.toContain('0 đồng');
  });
  it('shows stale/degraded disclosure while retaining last known good prices', async () => {
    const element = await render({
      current: {
        items: [base],
        retrievedAt: base.retrievedAt,
        stale: true,
        degraded: true,
        staleAfter: '2026-09-20T08:00:00Z',
      },
      history: { items: [base], page: 1, pageSize: 20, total: 1 },
      unavailable: false,
    });
    expect(element.textContent).toContain('gặp sự cố');
    expect(element.textContent).toContain('25.139');
  });
});
