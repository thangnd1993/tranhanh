import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../generated/prisma/client.js';
import { validateDataset } from './dataset.js';
import { assertStableAssignment, changed, importPhoneDataset } from './import-dataset.js';

const raw: unknown = JSON.parse(readFileSync(new URL('../../data/phone-prefixes.json', import.meta.url), 'utf8'));
const dataset = () => structuredClone(validateDataset(raw));

describe('reviewed authoritative dataset', () => {
  it('validates every identity, evidence link, format and historical relation', () => {
    const data = dataset();
    expect(data.prefixes.filter((x) => x.status === 'ACTIVE')).toHaveLength(36);
    expect(data.migrations).toHaveLength(21);
    expect(data.operators).toHaveLength(7);
  });
  it.each([
    ['086', 'viettel'],
    ['091', 'vinaphone'],
    ['090', 'mobifone'],
    ['052', 'vietnamobile'],
    ['059', 'gmobile'],
    ['087', 'itel'],
    ['055', 'wintel'],
  ])('matches reviewed allocation %s → %s', (prefix, key) => {
    expect(dataset().prefixes.find((x) => x.prefix === prefix)?.operatorKey).toBe(key);
  });
  it.each([
    ['0168', '038'],
    ['0123', '083'],
    ['0121', '079'],
    ['0186', '056'],
    ['0199', '059'],
  ])('matches reviewed conversion %s → %s', (oldPrefix, newPrefix) => {
    expect(dataset().migrations.find((x) => x.oldPrefix === oldPrefix)?.newPrefix).toBe(newPrefix);
  });
  it('rejects duplicate identities and missing evidence before persistence', () => {
    const duplicate = dataset();
    duplicate.prefixes.push(duplicate.prefixes[0]);
    expect(() => validateDataset(duplicate)).toThrow('duplicate');
    const missing = dataset();
    missing.references = [];
    expect(() => validateDataset(missing)).toThrow();
  });
  it('rejects migration/operator mismatch and missing legacy replacements', () => {
    const mismatch = dataset();
    mismatch.migrations[0].newPrefix = '086';
    expect(() => validateDataset(mismatch)).toThrow();
    const absent = dataset();
    absent.migrations.pop();
    expect(() => validateDataset(absent)).toThrow();
  });
  it('rejects source credentials, invalid dates, future retrievals and invalid status lengths', () => {
    const secret = dataset();
    secret.sources[0].homepageUrl = 'https://user:password@example.test';
    expect(() => validateDataset(secret)).toThrow();
    const reversed = dataset();
    reversed.prefixes[0].effectiveFrom = '2020-01-01T00:00:00Z';
    reversed.prefixes[0].effectiveTo = '2019-01-01T00:00:00Z';
    expect(() => validateDataset(reversed)).toThrow('effective interval');
    const future = dataset();
    future.references[0].retrievedAt = '2999-01-01T00:00:00Z';
    expect(() => validateDataset(future)).toThrow('future retrieval');
    const status = dataset();
    status.prefixes[0].status = 'ACTIVE';
    expect(() => validateDataset(status)).toThrow('length mismatch');
  });
  it('does not touch the database if validation fails', async () => {
    const fake = { dataSource: { upsert: vi.fn() } };
    await expect(importPhoneDataset(fake as unknown as PrismaClient, {})).rejects.toThrow();
    expect(fake.dataSource.upsert).not.toHaveBeenCalled();
  });
});

describe('idempotent import decisions', () => {
  it('recognizes identical values/dates without rewriting import/audit clocks', () => {
    const existing = { status: 'ACTIVE', effectiveFrom: new Date(0), updatedAt: new Date() };
    expect(changed(existing, { status: 'ACTIVE', effectiveFrom: new Date(0) })).toBe(false);
    expect(changed(existing, { status: 'INACTIVE', effectiveFrom: new Date(0) })).toBe(true);
    expect(changed(existing, { effectiveFrom: null })).toBe(true);
  });
  it('refuses silent historical reassignment', () => {
    expect(() => assertStableAssignment({ operatorId: 'same' }, 'same')).not.toThrow();
    expect(() => assertStableAssignment({ operatorId: 'old' }, 'new')).toThrow('history migration');
  });
});
