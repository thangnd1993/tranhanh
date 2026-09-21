import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import type { FuelLogSummary } from '@tranhanh/shared';
import { describe, expect, it, vi } from 'vitest';
import { equivalentPath, fuelLogPath } from '../i18n/routes';
import { FuelLogPageComponent } from './fuel-log-page.component';
import { FuelLogService } from './fuel-log.service';
const vehicle = '11111111-1111-4111-8111-111111111111';
const entry = '22222222-2222-4222-8222-222222222222';
const emptySummary: FuelLogSummary = {
  month: '2026-09',
  refuelCount: 0,
  totalQuantityLiters: '0.000',
  totalCostVnd: '0',
  averageActualUnitPriceVnd: null,
  completedIntervalCount: 0,
  averageLitersPer100Km: null,
  costPerKmVnd: null,
  economyAvailability: 'NO_FULL_TANK_BASELINE',
  latestOdometerKm: null,
  latestRefueledAt: null,
  intervals: [],
};
describe('Fuel Log UI and routes', () => {
  it('creates and translates every private Fuel Log route', () => {
    expect(fuelLogPath('vi', vehicle)).toBe(`/vi/garage/${vehicle}/nhien-lieu`);
    expect(fuelLogPath('en', vehicle, undefined, 'add')).toBe(`/en/garage/${vehicle}/fuel-log/add`);
    expect(fuelLogPath('vi', vehicle, entry, 'edit')).toBe(`/vi/garage/${vehicle}/nhien-lieu/${entry}/chinh-sua`);
    expect(equivalentPath(fuelLogPath('vi', vehicle, entry, 'edit'), 'en')).toBe(
      fuelLogPath('en', vehicle, entry, 'edit'),
    );
  });
  it('shows an honest empty and insufficient-data state without zero economy', async () => {
    const service = {
      list: vi.fn(async () => ({ items: [], page: 1, pageSize: 20, total: 0 })),
      summary: vi.fn(async () => emptySummary),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: FuelLogService, useValue: service },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: vehicle }) } } },
      ],
    });
    const fixture = TestBed.createComponent(FuelLogPageComponent);
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Chưa có lần đổ nhiên liệu nào.');
    });
    expect(fixture.nativeElement.textContent).toContain('Chưa đủ dữ liệu để tính mức tiêu thụ.');
    expect(fixture.nativeElement.textContent).not.toContain('0.0 L/100 km');
  });
});
