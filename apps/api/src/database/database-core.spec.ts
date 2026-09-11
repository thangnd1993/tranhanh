import { describe, expect, it } from 'vitest';
import { Prisma, ProviderStatus, SyncStatus } from '../generated/prisma/client.js';
import { bigintJsonReplacer } from './bigint-json.js';
import { mapDatabaseError } from './database-errors.js';
import { normalizeSourceUrl } from './source-validation.js';

describe('database boundary conventions', () => {
  it('serializes nested, negative, and zero BigInt without precision loss and preserves dates', () => {
    const value = { amount: 900719925474099312345n, nested: [0n, -9007199254740993n], at: new Date(0), nil: null };
    expect(JSON.parse(JSON.stringify(value, bigintJsonReplacer))).toEqual({
      amount: '900719925474099312345',
      nested: ['0', '-9007199254740993'],
      at: '1970-01-01T00:00:00.000Z',
      nil: null,
    });
    expect(() => JSON.stringify(1n)).toThrow();
  });

  it.each([
    ['P2002', 409, 'DATA_CONFLICT'],
    ['P2003', 409, 'DATA_RELATION_CONFLICT'],
    ['P2014', 409, 'DATA_RELATION_CONFLICT'],
    ['P2025', 404, 'DATA_NOT_FOUND'],
    ['P1001', 503, 'DATABASE_UNAVAILABLE'],
    ['P2024', 503, 'DATABASE_UNAVAILABLE'],
    ['P9999', 500, 'DATABASE_ERROR'],
  ])('maps %s without leaking driver details', (code, statusCode, safeCode) => {
    const error = new Prisma.PrismaClientKnownRequestError('secret connection string', {
      code,
      clientVersion: '7.10.0',
      meta: { target: 'private_field' },
    });
    const result = mapDatabaseError(error);
    expect(result).toMatchObject({ statusCode, code: safeCode });
    expect(JSON.stringify(result)).not.toMatch(/secret|private_field|7\.10/);
  });

  it('maps initialization failures and hides unknown error details', () => {
    expect(mapDatabaseError(new Prisma.PrismaClientInitializationError('secret', '7.10.0')).statusCode).toBe(503);
    expect(mapDatabaseError(new Error('secret')).statusCode).toBe(500);
  });

  it('exposes only supported lifecycle states', () => {
    expect(Object.values(ProviderStatus)).toEqual(['ACTIVE', 'DEGRADED', 'DISABLED']);
    expect(Object.values(SyncStatus)).toEqual(['RUNNING', 'SUCCEEDED', 'FAILED']);
  });

  it('normalizes a public source URL', () => {
    expect(normalizeSourceUrl('https://EXAMPLE.test/data')).toBe('https://example.test/data');
  });

  it.each([
    'ftp://example.test',
    'https://user:secret@example.test',
    'https://example.test?token=secret',
    'https://example.test/#fragment',
    'not a url',
    `https://example.test/${'a'.repeat(2048)}`,
  ])('rejects unsafe source metadata URL %s', (url) => expect(() => normalizeSourceUrl(url)).toThrow());
});
