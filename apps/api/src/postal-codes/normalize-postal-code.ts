import { BadRequestException } from '@nestjs/common';
export function normalizePostalCode(value: string): string {
  const normalized = value.trim().normalize('NFKC');
  if (!/^\d{5}$/.test(normalized))
    throw new BadRequestException('Vietnamese postal codes must contain exactly five digits.');
  return normalized;
}
