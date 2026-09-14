import { BadRequestException, NotFoundException } from '@nestjs/common';
export type AreaInput = { kind: 'CODE'; code: string } | { kind: 'NUMBER'; domestic: string };
export function exactAreaCode(value: string): string {
  if (!/^0[1-9]\d{0,2}$/.test(value))
    throw new BadRequestException('Use a domestic geographic code with leading zero.');
  return value;
}
/** Syntax only. No submitted subscriber digits may be passed into a database query or log. */
export function parseAreaInput(value: string): AreaInput {
  const raw = value.trim();
  if (!raw || raw.length > 32 || !/^\+?\d+(?:[ -]\d+)*-?$/.test(raw)) {
    throw new BadRequestException('Invalid Vietnamese geographic code or fixed-line number format.');
  }
  const trailing = raw.endsWith('-');
  let compact = raw.replace(/[ -]/g, '');
  let international = false;
  for (const marker of ['+84', '0084', '84']) {
    if (compact.startsWith(marker)) {
      compact = compact.slice(marker.length);
      international = true;
      break;
    }
  }
  if (compact.startsWith('+') || (international && (!compact || compact.startsWith('0')))) {
    throw new BadRequestException('Use country code 84 without a domestic trunk zero.');
  }
  const domestic = international || !compact.startsWith('0') ? '0' + compact : compact;
  if (/^0[1-9]\d{0,2}$/.test(domestic)) return { kind: 'CODE', code: domestic };
  // Full legacy numbers overlap mobile ranges; deliberately support only current geographic numbers.
  if (!trailing && (international || compact.startsWith('0')) && /^02\d{9}$/.test(domestic)) {
    return { kind: 'NUMBER', domestic };
  }
  throw new BadRequestException('Unsupported fixed-line number format; use an area code for historical queries.');
}
/** Known active allocations, longest valid match; no invented 02xxx codes or subscriber verification. */
export function matchAreaNumber(domestic: string, knownCodes: readonly string[]): string {
  if (!/^02\d{9}$/.test(domestic)) throw new BadRequestException('Invalid fixed-line number length.');
  const code = [...knownCodes]
    .filter((code) => /^02\d{1,2}$/.test(code) && domestic.startsWith(code))
    .sort((a, b) => b.length - a.length || a.localeCompare(b))[0];
  if (!code) throw new NotFoundException('Area code not found in the reviewed dataset.');
  return code;
}
