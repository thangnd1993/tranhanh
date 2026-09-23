import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { VehicleDashboardOption, VehicleDashboardResult } from '@tranhanh/shared';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { equivalentPath, dashboardPath } from '../i18n/routes';
import { DashboardService } from './dashboard.service';
import { DashboardPageComponent } from './dashboard-page.component';

const vehicle = (id: string, displayName: string): VehicleDashboardOption => ({
  id,
  displayName,
  licensePlate: id === 'vehicle-a' ? '51K-123.45' : '30A-123.45',
  vehicleType: 'CAR',
  isPrimary: id === 'vehicle-a',
});

function dashboard(id: string, displayName: string): VehicleDashboardResult {
  return {
    month: '2026-09',
    refreshedAt: '2026-09-21T04:00:00.000Z',
    activeVehicleCount: 2,
    vehicles: [vehicle('vehicle-a', 'Primary'), vehicle('vehicle-b', 'Backup')],
    selectedVehicle: { ...vehicle(id, displayName), currentOdometerKm: null },
    documentAttention: { expired: 0, expiringSoon: 0, nextExpiry: null },
    maintenance: { activePlanCount: 0, duePlanCount: 0, dueSoonPlanCount: 0, unknownMileagePlanCount: 0 },
    expenses: {
      month: '2026-09',
      recordedTotalCostVnd: '0',
      totalCostVnd: '0',
      totalCount: 0,
      fuel: { count: 0, recordedTotalCostVnd: '0', unknownCostCount: 0 },
      maintenance: { count: 0, recordedTotalCostVnd: '0', unknownCostCount: 0 },
      manual: { count: 0, recordedTotalCostVnd: '0', unknownCostCount: 0 },
      bySource: {
        FUEL: { count: 0, recordedTotalCostVnd: '0', unknownCostCount: 0 },
        MAINTENANCE: { count: 0, recordedTotalCostVnd: '0', unknownCostCount: 0 },
        MANUAL: { count: 0, recordedTotalCostVnd: '0', unknownCostCount: 0 },
      },
      byCategory: [],
      unknownMaintenanceCostCount: 0,
      incomplete: false,
    },
    fuel: {
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
    },
    monitoring: null,
    featureLinks: [{ key: 'GARAGE', path: `/garage/${id}` }],
  };
}

function authFake() {
  return { ready: vi.fn(async () => undefined), user: vi.fn(() => ({ id: 'user-a' })), message: vi.fn(() => 'failed') };
}

describe('dashboard UI and localized routes', () => {
  it('maps bilingual dashboard routes', () => {
    expect(dashboardPath('vi')).toBe('/vi/tong-quan');
    expect(dashboardPath('en')).toBe('/en/dashboard');
    expect(equivalentPath(dashboardPath('vi'), 'en')).toBe(dashboardPath('en'));
  });

  it('renders a clear Garage state when the owner has no active vehicle', async () => {
    const empty: VehicleDashboardResult = {
      ...dashboard('vehicle-a', 'Primary'),
      activeVehicleCount: 0,
      vehicles: [],
      selectedVehicle: null,
      documentAttention: null,
      maintenance: null,
      expenses: null,
      fuel: null,
      monitoring: null,
      featureLinks: [{ key: 'GARAGE', path: '/garage' }],
    };
    const service = { get: vi.fn(async () => empty) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: DashboardService, useValue: service },
        { provide: AuthService, useValue: authFake() },
      ],
    });
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Chưa có xe đang hoạt động');
    });
    expect(fixture.nativeElement.textContent).toContain('Thêm xe đầu tiên');
  });

  it('keeps the SSR shell neutral and fetches only in the browser', async () => {
    const service = { get: vi.fn(async () => dashboard('vehicle-a', 'Primary')) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: DashboardService, useValue: service },
        { provide: AuthService, useValue: authFake() },
      ],
    });
    TestBed.createComponent(DashboardPageComponent);
    expect(service.get).not.toHaveBeenCalled();
  });

  it('discards stale selector responses and keeps the latest selected vehicle', async () => {
    let resolveFirst!: (value: VehicleDashboardResult) => void;
    let resolveSecond!: (value: VehicleDashboardResult) => void;
    const first = new Promise<VehicleDashboardResult>((resolve) => (resolveFirst = resolve));
    const second = new Promise<VehicleDashboardResult>((resolve) => (resolveSecond = resolve));
    const service = { get: vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: DashboardService, useValue: service },
        { provide: AuthService, useValue: authFake() },
      ],
    });
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as { selectVehicle(event: Event): void };
    component.selectVehicle({ target: { value: 'vehicle-b' } } as unknown as Event);
    resolveSecond(dashboard('vehicle-b', 'Backup'));
    await fixture.whenStable();
    resolveFirst(dashboard('vehicle-a', 'Primary'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Backup');
    expect(
      (fixture.componentInstance as unknown as { data(): VehicleDashboardResult | null }).data()?.selectedVehicle
        ?.displayName,
    ).toBe('Backup');
  });
});
