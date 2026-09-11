import { describe, expect, it } from 'vitest';
import { phonePrismaFixture, phoneRows } from '../../test/fixtures/phone-rows.js';
import type { PrismaService } from '../database/prisma.service.js';
import { PhonePrefixesService } from './phone-prefixes.service.js';

describe('phone-prefix service boundaries', () => {
  it('never sends subscriber digits to database queries', async () => {
    const fake = phonePrismaFixture();
    const service = new PhonePrefixesService(fake as unknown as PrismaService);
    const result = await service.lookup('0861234567');
    expect(result.prefix).toBe('086');
    expect(JSON.stringify(fake.phonePrefix.findUnique.mock.calls)).not.toContain('1234567');
    expect(result.source.publisher).toBe('Test-only publisher');
  });
  it('refuses a legacy full number without a known replacement relation', async () => {
    const fake = phonePrismaFixture();
    fake.phonePrefix.findUnique.mockResolvedValueOnce({ ...phoneRows()[0], replacement: null });
    const service = new PhonePrefixesService(fake as unknown as PrismaService);
    await expect(service.lookup('01681234567')).rejects.toMatchObject({ status: 404 });
  });
  it('returns a clean empty page for an unknown operator filter', async () => {
    const fake = phonePrismaFixture();
    const service = new PhonePrefixesService(fake as unknown as PrismaService);
    expect(await service.list({ operator: 'unknown' })).toEqual({ page: 1, pageSize: 20, total: 0, items: [] });
  });
});
