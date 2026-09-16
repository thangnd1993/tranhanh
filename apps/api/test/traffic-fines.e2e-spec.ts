import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import {
  TRAFFIC_FINE_PROVIDER,
  TrafficFineProviderError,
  type TrafficFineProvider,
  type TrafficFineProviderQuery,
} from '../src/traffic-fines/traffic-fine-provider.js';
class FakeProvider implements TrafficFineProvider {
  describe() {
    return {
      key: 'fixture-official',
      name: 'Official fixture',
      official: true,
      url: 'https://official.example.test/lookup',
      automation: 'AUTOMATION_ALLOWED' as const,
      status: 'ACTIVE' as const,
      geographicCoverage: 'Fixture only',
      supportedVehicleTypes: ['CAR', 'MOTORCYCLE', 'ELECTRIC_BICYCLE'] as const,
      requiresCaptcha: false,
      requiresAuthentication: false,
      freshness: 'Fixture clock',
    };
  }
  async lookup(query: TrafficFineProviderQuery) {
    const now = '2026-09-16T08:00:00+07:00';
    const limitations = [{ code: 'COVERAGE_NOT_GUARANTEED' as const, message: 'Fixture coverage only.' }];
    if (query.normalizedPlate === '97Z00000') throw new TrafficFineProviderError('UNAVAILABLE', 'private 97Z00000');
    if (query.normalizedPlate === '96Z00000')
      return {
        outcome: 'MANUAL_VERIFICATION_REQUIRED' as const,
        records: [],
        retrievedAt: now,
        limitations: [{ code: 'CAPTCHA_REQUIRED' as const, message: 'Manual security code required.' }],
      };
    if (query.normalizedPlate === '98Z00000')
      return { outcome: 'NO_MATCHING_RECORDS' as const, records: [], retrievedAt: now, limitations };
    return {
      outcome: 'RESULTS_AVAILABLE' as const,
      records: [
        {
          violationTime: '2026-09-15T10:30:00+07:00',
          violationLocation: 'Fixture location',
          violationBehavior: 'Fixture behavior',
          status: 'UNKNOWN' as const,
        },
      ],
      retrievedAt: now,
      limitations,
    };
  }
}
describe('traffic-fine lookup HTTP API', () => {
  let app: INestApplication;
  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    const fixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TRAFFIC_FINE_PROVIDER)
      .useValue(new FakeProvider())
      .compile();
    app = fixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
    await app.init();
  });
  afterAll(async () => app.close());
  const lookup = (plate: string) =>
    request(app.getHttpServer()).post('/api/v1/traffic-fines/lookup').send({ licensePlate: plate, vehicleType: 'CAR' });
  it('is public with or without an auth header and returns only a masked plate', async () => {
    const response = await lookup('99Z-000.00').expect(200);
    expect(response.body).toMatchObject({ outcome: 'RESULTS_AVAILABLE', queriedPlateMasked: '99Z-***.00' });
    expect(response.headers).toMatchObject({
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
      'x-robots-tag': 'noindex',
    });
    expect(JSON.stringify(response.body)).not.toContain('99Z00000');
    await lookup('95Z-000.00').set('Authorization', 'Bearer synthetic-auth-header').expect(200);
  });
  it('distinguishes no matching records, unavailable, and manual verification', async () => {
    await lookup('98Z-000.00')
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ outcome: 'NO_MATCHING_RECORDS', results: [] }));
    await lookup('97Z-000.00')
      .expect(503)
      .expect(({ body }) => {
        expect(body).toMatchObject({ outcome: 'SOURCE_UNAVAILABLE', providerError: 'UNAVAILABLE' });
        expect(JSON.stringify(body)).not.toContain('97Z00000');
      });
    await lookup('96Z-000.00')
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ outcome: 'MANUAL_VERIFICATION_REQUIRED', results: [] }));
  });
  it('rejects malformed or unrelated input', async () => {
    await lookup('not-a-plate').expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/traffic-fines/lookup')
      .send({ licensePlate: '99Z-000.00', vehicleType: 'CAR', citizenId: 'secret' })
      .expect(400);
  });
  it('eventually rate limits one anonymous identity without plate-based tracking', async () => {
    let limited = false;
    for (let i = 0; i < 15; i++) {
      const response = await lookup('94Z-000.00');
      if (response.status === 429) {
        limited = true;
        break;
      }
    }
    expect(limited).toBe(true);
  });
});
