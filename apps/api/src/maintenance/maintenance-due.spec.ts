import { describe, expect, it } from 'vitest';
import { maintenanceDueStatus, parseDateOnly, vietnamToday } from './maintenance-due.js';

describe('maintenance due calculator', () => {
  it('uses the Vietnam calendar boundary', () => {
    expect(vietnamToday(new Date('2026-09-20T16:59:59.999Z'))).toBe('2026-09-20');
    expect(vietnamToday(new Date('2026-09-20T17:00:00.000Z'))).toBe('2026-09-21');
  });

  it('uses Vietnam calendar dates and a documented 30-day due-soon window', () => {
    expect(maintenanceDueStatus({ dueDate: '2026-10-21' }, null, '2026-09-21')).toBe('DUE_SOON');
    expect(maintenanceDueStatus({ dueDate: '2026-10-22' }, null, '2026-09-21')).toBe('NOT_DUE');
    expect(maintenanceDueStatus({ dueDate: '2026-09-21' }, null, '2026-09-21')).toBe('DUE');
    expect(maintenanceDueStatus({ dueOdometerKm: 81_000 }, 80_000, '2026-09-21')).toBe('DUE_SOON');
    expect(maintenanceDueStatus({ dueOdometerKm: 81_001 }, 80_000, '2026-09-21')).toBe('NOT_DUE');
  });

  it('makes either reached threshold due', () => {
    expect(maintenanceDueStatus({ dueDate: '2026-12-01', dueOdometerKm: 80_000 }, 80_000, '2026-09-21')).toBe('DUE');
    expect(maintenanceDueStatus({ dueDate: '2026-09-01', dueOdometerKm: 80_000 }, 1_000, '2026-09-21')).toBe('DUE');
  });

  it('exposes unknown mileage when the only remaining signal is odometer', () => {
    expect(maintenanceDueStatus({ dueOdometerKm: 80_000 }, null, '2026-09-21')).toBe('UNKNOWN_MILEAGE');
  });

  it('accepts only real calendar dates', () => {
    expect(parseDateOnly('2026-02-28')?.toISOString()).toBe('2026-02-28T00:00:00.000Z');
    expect(() => parseDateOnly('2026-02-30')).toThrow();
  });
});
