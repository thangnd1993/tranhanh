import { HttpException } from '@nestjs/common';
import type { TrafficFineProviderInfo } from '@tranhanh/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ManualTrafficFineProvider } from './manual-traffic-fine.provider.js';
import {
  TrafficFineProviderError,
  type TrafficFineProvider,
  type TrafficFineProviderQuery,
  type TrafficFineProviderResult,
} from './traffic-fine-provider.js';
import { TrafficFinesService } from './traffic-fines.service.js';

const info: TrafficFineProviderInfo = {
  key: 'fixture-official',
  name: 'Official fixture',
  official: true,
  url: 'https://official.example.test/lookup',
  automation: 'AUTOMATION_ALLOWED',
  status: 'ACTIVE',
  geographicCoverage: 'Fixture coverage only',
  supportedVehicleTypes: ['CAR', 'MOTORCYCLE'],
  requiresCaptcha: false,
  requiresAuthentication: false,
  freshness: 'Fixture timestamp semantics.',
};
class FakeProvider implements TrafficFineProvider {
  query?: TrafficFineProviderQuery;
  constructor(
    private readonly value: TrafficFineProviderResult | Error,
    private readonly metadata = info,
  ) {}
  describe() {
    return this.metadata;
  }
  async lookup(query: TrafficFineProviderQuery): Promise<TrafficFineProviderResult> {
    this.query = query;
    if (this.value instanceof Error) throw this.value;
    return this.value;
  }
}
const retrievedAt = '2026-09-16T08:00:00+07:00';
const limitations = [
  { code: 'COVERAGE_NOT_GUARANTEED' as const, message: 'Fixture coverage does not imply a nationwide result.' },
];
const record = {
  violationTime: '2026-09-15T10:30:00+07:00',
  violationLocation: '  Km 10, Quốc lộ 1  ',
  violationBehavior: 'Vượt đèn đỏ',
  detectingAuthority: 'Đơn vị A',
  processingAuthority: null,
  status: 'UNRESOLVED' as const,
  providerStatusText: 'Chưa xử lý',
  sourceUpdatedAt: '2026-09-16',
  publicReference: 'REF-SYNTHETIC',
};
afterEach(() => vi.restoreAllMocks());
describe('TrafficFinesService', () => {
  it('normalizes, fingerprints and deduplicates without using the query plate in identity', async () => {
    const provider = new FakeProvider({
      outcome: 'RESULTS_AVAILABLE',
      records: [record, record, { ...record, violationLocation: 'Km 11, Quốc lộ 1' }],
      retrievedAt,
      limitations,
    });
    const service = new TrafficFinesService(provider);
    const first = await service.lookup({ licensePlate: '99z-000.00', vehicleType: 'CAR' });
    expect(provider.query).toEqual({ normalizedPlate: '99Z00000', vehicleType: 'CAR' });
    expect(first.queriedPlateMasked).toBe('99Z-***.00');
    expect(first.results).toHaveLength(2);
    expect(first.results[0]).toMatchObject({
      violationLocation: 'Km 10, Quốc lộ 1',
      status: 'UNRESOLVED',
      providerKey: 'fixture-official',
    });
    expect(first.results[0].fingerprint).toMatch(/^[0-9a-f]{64}$/);
    const second = await service.lookup({ licensePlate: '98z-000.00', vehicleType: 'CAR' });
    expect(second.results[0].fingerprint).toBe(first.results[0].fingerprint);
  });
  it('keeps no-record semantics explicit and accepts genuinely partial records', async () => {
    await expect(
      new TrafficFinesService(
        new FakeProvider({ outcome: 'NO_MATCHING_RECORDS', records: [], retrievedAt, limitations }),
      ).lookup({ licensePlate: '99Z-000.00', vehicleType: 'CAR' }),
    ).resolves.toMatchObject({ outcome: 'NO_MATCHING_RECORDS', results: [] });
    const response = await new TrafficFinesService(
      new FakeProvider({
        outcome: 'RESULTS_AVAILABLE',
        records: [{ violationBehavior: 'Source wording only' }],
        retrievedAt,
        limitations,
      }),
    ).lookup({ licensePlate: '99Z-000.00', vehicleType: 'CAR' });
    expect(response.results[0]).toMatchObject({
      violationBehavior: 'Source wording only',
      violationTime: null,
      status: 'UNKNOWN',
    });
  });
  it.each(['UNAVAILABLE', 'TIMEOUT', 'RATE_LIMITED', 'DEGRADED'] as const)(
    'maps %s without exposing upstream text',
    async (code) => {
      const service = new TrafficFinesService(
        new FakeProvider(new TrafficFineProviderError(code, '99Z00000 private upstream HTML')),
      );
      try {
        await service.lookup({ licensePlate: '99Z-000.00', vehicleType: 'CAR' });
        expect.fail('expected provider error');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(JSON.stringify((error as HttpException).getResponse())).not.toContain('99Z00000');
        expect((error as HttpException).getStatus()).toBe(503);
      }
    },
  );
  it('rejects malformed provider payloads as a safe 502 and drops unknown raw fields', async () => {
    const malformed = {
      outcome: 'RESULTS_AVAILABLE',
      records: '<html>99Z00000</html>',
      retrievedAt,
      limitations,
    } as unknown as TrafficFineProviderResult;
    const service = new TrafficFinesService(new FakeProvider(malformed));
    await expect(service.lookup({ licensePlate: '99Z-000.00', vehicleType: 'CAR' })).rejects.toMatchObject({
      status: 502,
    });
    const rawRecord = { ...record, ownerName: 'Private Person', submittedPlate: '99Z00000' };
    const safe = await new TrafficFinesService(
      new FakeProvider({ outcome: 'RESULTS_AVAILABLE', records: [rawRecord], retrievedAt, limitations }),
    ).lookup({ licensePlate: '99Z-000.00', vehicleType: 'CAR' });
    expect(JSON.stringify(safe)).not.toMatch(/Private Person|99Z00000/);
  });
  it('does not log or persist the request and the default provider truthfully requires manual verification', async () => {
    const spies = [
      vi.spyOn(console, 'log'),
      vi.spyOn(console, 'info'),
      vi.spyOn(console, 'warn'),
      vi.spyOn(console, 'error'),
    ];
    const response = await new TrafficFinesService(new ManualTrafficFineProvider()).lookup({
      licensePlate: '99Z-000.00',
      vehicleType: 'CAR',
    });
    expect(response).toMatchObject({
      outcome: 'MANUAL_VERIFICATION_REQUIRED',
      results: [],
      queriedPlateMasked: '99Z-***.00',
      provider: { automation: 'MANUAL_ONLY', requiresCaptcha: true },
    });
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    expect(JSON.stringify(response)).not.toContain('99Z00000');
  });
  it('returns unsupported before provider transport when capability excludes the vehicle type', async () => {
    const provider = new FakeProvider(
      { outcome: 'NO_MATCHING_RECORDS', records: [], retrievedAt, limitations },
      { ...info, supportedVehicleTypes: ['CAR'] },
    );
    await expect(
      new TrafficFinesService(provider).lookup({ licensePlate: '99Z-000.00', vehicleType: 'MOTORCYCLE' }),
    ).resolves.toMatchObject({ outcome: 'UNSUPPORTED' });
    expect(provider.query).toBeUndefined();
  });
});
