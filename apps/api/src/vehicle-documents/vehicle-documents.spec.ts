import { describe, expect, it, vi } from 'vitest';
import { addDays, dayDifference, expiryDetails, parseDateOnly, vietnamToday } from './vehicle-document-date.js';
import { VEHICLE_DOCUMENT_REMINDER_JOB, vehicleDocumentReminderJobOptions } from './vehicle-document-reminder.queue.js';
import { VehicleDocumentsService } from './vehicle-documents.service.js';
describe('vehicle documents and reminders', () => {
  it('uses strict date-only values and Vietnam calendar-day expiry states', () => {
    expect(() => parseDateOnly('2026-02-29')).toThrow('INVALID_DATE_ONLY');
  });
  it('calculates leap-safe dates without timezone drift', () => {
    expect(parseDateOnly('2028-02-29')?.toISOString()).toBe('2028-02-29T00:00:00.000Z');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
    expect(dayDifference('2026-09-17', '2026-10-17')).toBe(30);
    expect(vietnamToday(new Date('2026-09-16T17:30:00Z'))).toBe('2026-09-17');
    expect(expiryDetails(new Date('2026-10-17T00:00:00Z'), new Date('2026-09-17T01:00:00Z'))).toEqual({
      expiryState: 'EXPIRING_SOON',
      daysUntilExpiry: 30,
    });
  });
  it('defines bounded retries and a privacy-safe queue payload', () => {
    expect(VEHICLE_DOCUMENT_REMINDER_JOB).toBe('vehicle-document-reminder-due');
    expect(vehicleDocumentReminderJobOptions).toMatchObject({ attempts: 3, backoff: { type: 'exponential' } });
    const payload = { reminderId: 'opaque-id' };
    expect(Object.keys(payload)).toEqual(['reminderId']);
    expect(JSON.stringify(payload)).not.toMatch(/plate|reference|email/i);
  });
  it('uses safe 404 ownership filtering for list, detail, mutation, and reminder access', async () => {
    const prisma = {
      vehicle: { findFirst: vi.fn(async () => null) },
      vehicleDocument: { findFirst: vi.fn(async () => null) },
    };
    const service = new VehicleDocumentsService(prisma as never, { reconcile: vi.fn() } as never);
    await expect(service.list('stranger', 'vehicle-a', 'ACTIVE')).rejects.toMatchObject({ status: 404 });
    await expect(service.get('stranger', 'vehicle-a', 'document-a')).rejects.toMatchObject({ status: 404 });
    await expect(service.update('stranger', 'vehicle-a', 'document-a', {})).rejects.toMatchObject({ status: 404 });
    await expect(service.reminders('stranger', 'vehicle-a', 'document-a', [7])).rejects.toMatchObject({ status: 404 });
  });
});
