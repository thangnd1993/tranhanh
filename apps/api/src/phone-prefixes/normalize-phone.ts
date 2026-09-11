import { BadRequestException } from '@nestjs/common';

export interface ParsedPhonePrefix {
  prefix: string;
  kind: 'PREFIX' | 'CURRENT_NUMBER' | 'LEGACY_NUMBER';
}

export function exactPrefix(value: string): string {
  if (!/^\d{3,4}$/.test(value)) {
    throw new BadRequestException('Provide a three- or four-digit prefix.');
  }
  return value;
}

/** Return only a prefix. Never retain, return, or log the subscriber portion. */
export function normalizePhone(value: string): ParsedPhonePrefix {
  const input = value.trim();
  if (!input || input.length > 32 || !/^\+?\d+(?:[ -]\d+)*$/.test(input)) {
    throw new BadRequestException('Invalid or unsupported Vietnamese mobile input.');
  }
  const compact = input.replace(/[ -]/g, '');
  if (/^\d{3,4}$/.test(compact)) {
    return { prefix: exactPrefix(compact), kind: 'PREFIX' };
  }
  let domestic = compact;
  for (const country of ['+84', '0084', '84']) {
    if (compact.startsWith(country)) {
      domestic = '0' + compact.slice(country.length);
      break;
    }
  }
  if (/^0[35789]\d{8}$/.test(domestic)) {
    return { prefix: domestic.slice(0, 3), kind: 'CURRENT_NUMBER' };
  }
  if (/^01[2689]\d{8}$/.test(domestic)) {
    return { prefix: domestic.slice(0, 4), kind: 'LEGACY_NUMBER' };
  }
  throw new BadRequestException('Invalid or unsupported Vietnamese mobile input.');
}
