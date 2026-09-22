import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import type { VehicleExpenseLedgerResult, VehicleExpenseSummary } from '@tranhanh/shared';
import { describe, expect, it, vi } from 'vitest';
import { equivalentPath, expensePath } from '../i18n/routes';
import { VehicleExpenseService } from './vehicle-expense.service';
import { VehicleExpensesPageComponent } from './vehicle-expenses-page.component';

const vehicleId = '11111111-1111-4111-8111-111111111111';
const expenseId = '22222222-2222-4222-8222-222222222222';

const summary: VehicleExpenseSummary = {
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
};

function page(items: VehicleExpenseLedgerResult['items'] = []): VehicleExpenseLedgerResult {
  return { items, page: 1, pageSize: 20, total: items.length };
}

describe('vehicle expenses UI and localized routes', () => {
  it('maps bilingual list/add/detail/edit routes', () => {
    expect(expensePath('vi', vehicleId)).toBe(`/vi/garage/${vehicleId}/chi-phi`);
    expect(expensePath('en', vehicleId, expenseId, 'edit')).toBe(`/en/garage/${vehicleId}/expenses/${expenseId}/edit`);
    expect(equivalentPath(expensePath('vi', vehicleId, expenseId), 'en')).toBe(expensePath('en', vehicleId, expenseId));
  });

  it('keeps the SSR shell neutral and renders an honest empty state after browser fetch', async () => {
    const service = {
      ledger: vi.fn(async () => page()),
      summary: vi.fn(async () => summary),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: VehicleExpenseService, useValue: service },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: vehicleId }) } } },
      ],
    });
    const fixture = TestBed.createComponent(VehicleExpensesPageComponent);
    expect(fixture.nativeElement.textContent).not.toContain('Chưa có chi phí');
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Chưa có chi phí trong tháng này');
    });
    expect(service.ledger).toHaveBeenCalledWith(vehicleId, 'ACTIVE', expect.stringMatching(/^\d{4}-\d{2}$/), 1, 20);
  });

  it('keeps date-only ledger days stable in a negative UTC offset', () => {
    const service = {
      ledger: vi.fn(async () => page()),
      summary: vi.fn(async () => summary),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: VehicleExpenseService, useValue: service },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: vehicleId }) } } },
      ],
    });
    const fixture = TestBed.createComponent(VehicleExpensesPageComponent);
    const component = fixture.componentInstance as unknown as { date(value: string): string };
    const instant = new Date('2026-09-01T00:00:00.000Z');
    const negativeOffsetDay = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instant);
    expect(negativeOffsetDay).toBe('2026-08-31');
    const expected = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeZone: 'UTC' }).format(instant);
    expect(component.date('2026-09-01')).toBe(expected);
  });
});
