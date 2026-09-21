import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import type { MaintenanceHistoryResult, MaintenancePlanResult, MaintenanceSummary } from '@tranhanh/shared';
import { describe, expect, it, vi } from 'vitest';
import { equivalentPath, maintenanceHistoryPath, maintenancePlanPath } from '../i18n/routes';
import { MaintenancePageComponent } from './maintenance-page.component';
import { MaintenanceService } from './maintenance.service';

const vehicle = '11111111-1111-4111-8111-111111111111';
const history = '22222222-2222-4222-8222-222222222222';
const plan = '33333333-3333-4333-8333-333333333333';
const emptySummary: MaintenanceSummary = {
  activeHistoryCount: 0,
  activePlanCount: 0,
  duePlanCount: 0,
  dueSoonPlanCount: 0,
  totalCostVnd: '0',
  unknownCostHistoryCount: 0,
  latestServiceDate: null,
};

function historyItem(id: string, title: string): MaintenanceHistoryResult {
  return {
    id,
    vehicleId: vehicle,
    title,
    category: 'Engine',
    serviceDate: '2026-09-21',
    odometerKm: null,
    totalCostVnd: '0',
    workshop: null,
    notes: null,
    status: 'ACTIVE',
    archivedAt: null,
    completedPlanId: null,
    createdAt: '2026-09-21T00:00:00.000Z',
    updatedAt: '2026-09-21T00:00:00.000Z',
  };
}

function planItem(id: string, title: string): MaintenancePlanResult {
  return {
    id,
    vehicleId: vehicle,
    title,
    dueDate: '2026-10-01',
    dueOdometerKm: null,
    notes: null,
    status: 'ACTIVE',
    dueStatus: 'NOT_DUE',
    currentOdometerKm: null,
    completedAt: null,
    completionHistoryId: null,
    archivedAt: null,
    createdAt: '2026-09-21T00:00:00.000Z',
    updatedAt: '2026-09-21T00:00:00.000Z',
  };
}

describe('maintenance UI and routes', () => {
  it('creates and translates localized history and plan routes', () => {
    expect(maintenanceHistoryPath('vi', vehicle, undefined, 'add')).toBe(
      `/vi/garage/${vehicle}/bao-duong/lich-su/them`,
    );
    expect(maintenancePlanPath('en', vehicle, plan, 'edit')).toBe(
      `/en/garage/${vehicle}/maintenance/plans/${plan}/edit`,
    );
    expect(equivalentPath(maintenanceHistoryPath('vi', vehicle, history, 'edit'), 'en')).toBe(
      maintenanceHistoryPath('en', vehicle, history, 'edit'),
    );
  });

  it('shows empty private history and plan states without SSR data', async () => {
    const service = {
      history: vi.fn(async () => ({ items: [], page: 1, pageSize: 20, total: 0 })),
      plans: vi.fn(async () => ({ items: [], page: 1, pageSize: 20, total: 0 })),
      summary: vi.fn(async () => emptySummary),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: MaintenanceService, useValue: service },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: vehicle }) } } },
      ],
    });
    const fixture = TestBed.createComponent(MaintenancePageComponent);
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Chưa có kế hoạch');
    });
    expect(fixture.nativeElement.textContent).toContain('Chưa có lịch sử');
  });
  it('loads independent history and plan pages, then resets both on filter change', async () => {
    const service = {
      history: vi.fn(async (_vehicleId: string, status: string, page: number) => ({
        items: Array.from({ length: page === 1 ? 20 : 1 }, (_, index) =>
          historyItem(`history-${status}-${page}-${index}`, page === 1 ? `History ${index + 1}` : 'History 21'),
        ),
        page,
        pageSize: 20,
        total: 21,
      })),
      plans: vi.fn(async (_vehicleId: string, status: string, page: number) => ({
        items: Array.from({ length: page === 1 ? 20 : 1 }, (_, index) =>
          planItem(`plan-${status}-${page}-${index}`, page === 1 ? `Plan ${index + 1}` : 'Plan 21'),
        ),
        page,
        pageSize: 20,
        total: 21,
      })),
      summary: vi.fn(async () => emptySummary),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: MaintenanceService, useValue: service },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: vehicle }) } } },
      ],
    });
    const fixture = TestBed.createComponent(MaintenancePageComponent);
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(service.history).toHaveBeenLastCalledWith(vehicle, 'ACTIVE', 1, 20);
      expect(service.plans).toHaveBeenLastCalledWith(vehicle, 'ACTIVE', 1, 20);
      expect(fixture.nativeElement.textContent).toContain('History 1');
      expect(fixture.nativeElement.textContent).toContain('Plan 1');
    });
    const moreButtons = () => Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(moreButtons()).toHaveLength(2);
    moreButtons()[0].click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(service.plans).toHaveBeenLastCalledWith(vehicle, 'ACTIVE', 2, 20);
      expect(fixture.nativeElement.textContent).toContain('Plan 21');
    });
    expect(service.history).toHaveBeenLastCalledWith(vehicle, 'ACTIVE', 1, 20);
    moreButtons()[0].click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(service.history).toHaveBeenLastCalledWith(vehicle, 'ACTIVE', 2, 20);
      expect(fixture.nativeElement.textContent).toContain('History 21');
    });
    expect(fixture.nativeElement.textContent).toContain('History 21');
    expect(fixture.nativeElement.textContent).toContain('Plan 21');
    const checkbox = fixture.nativeElement.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(service.history).toHaveBeenLastCalledWith(vehicle, 'ALL', 1, 20);
      expect(service.plans).toHaveBeenLastCalledWith(vehicle, 'ALL', 1, 20);
    });
  });
});
