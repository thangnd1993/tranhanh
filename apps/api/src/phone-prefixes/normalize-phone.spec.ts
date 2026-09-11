import { describe, expect, it } from 'vitest';
import { normalizeSearch } from '../common/normalize-search.js';
import { exactPrefix, normalizePhone } from './normalize-phone.js';

describe('mobile input normalization', () => {
  it.each(['086', ' 086 ', '0861234567', '+84861234567', '0084861234567', '84 86 123 4567', '086-123-4567'])(
    'extracts only a prefix from %s',
    (input) => {
      const result = normalizePhone(input);
      expect(result.prefix).toBe('086');
      expect(JSON.stringify(result)).not.toContain('1234567');
    },
  );
  it.each(['0168', '01681234567', '+841681234567', '00841681234567'])('preserves legacy context for %s', (input) =>
    expect(normalizePhone(input).prefix).toBe('0168'),
  );
  it('distinguishes prefixes, current numbers, and historical numbers', () => {
    expect(normalizePhone('086').kind).toBe('PREFIX');
    expect(normalizePhone('+84861234567').kind).toBe('CURRENT_NUMBER');
    expect(normalizePhone('01681234567').kind).toBe('LEGACY_NUMBER');
  });
  it.each([
    '',
    'abc',
    '086abc1234567',
    '+840861234567',
    '+18861234567',
    '00840861234567',
    '086123',
    '08612345678',
    '0241234567',
    '0123456789',
    '++84861234567',
    '086--1234567',
    '086\n1234567',
    '086.123.4567',
    '０８６',
    '0'.repeat(100),
  ])('rejects invalid input %s', (input) => {
    expect(() => normalizePhone(input)).toThrow();
  });
  it('leaves unknown numeric candidates for a database 404, never declares an allocation', () => {
    expect(normalizePhone('999')).toEqual({ prefix: '999', kind: 'PREFIX' });
    expect(() => exactPrefix('0861234567')).toThrow();
  });
  it('normalizes Vietnamese search without modifying canonical display names', () => {
    expect(normalizeSearch('  ĐIỆN Thoại  ')).toBe('dien thoai');
    expect(normalizeSearch('VINAphone')).toBe('vinaphone');
  });
});
