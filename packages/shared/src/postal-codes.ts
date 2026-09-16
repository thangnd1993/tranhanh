import type { PageResult } from './pagination.js';
import type { PhoneSource } from './phone-prefixes.js';

export type PostalCodeTargetType = 'PROVINCE_CITY' | 'WARD' | 'COMMUNE' | 'SPECIAL_ZONE';
export type PostalCodeStatus = 'ACTIVE' | 'INACTIVE';
export type PostalCodeSource = PhoneSource;
export interface PostalCodeTargetResult {
  key: string;
  name: string;
  aliases: string[];
  type: PostalCodeTargetType;
}
export interface PostalCodeResult {
  key: string;
  code: string;
  status: PostalCodeStatus;
  target: PostalCodeTargetResult;
  hierarchy: PostalCodeTargetResult[];
  effectiveFrom: string | null;
  effectiveTo: string | null;
  source: PostalCodeSource;
  importedAt: string;
  updatedAt: string;
}
export interface PostalCodeLookupResult {
  query: string;
  matches: PostalCodeResult[];
  ambiguous: boolean;
}
export interface PostalCodeQuery {
  q?: string;
  code?: string;
  province?: string;
  targetType?: PostalCodeTargetType;
  status?: PostalCodeStatus;
  page?: number;
  pageSize?: number;
}
export type PostalCodePage = PageResult<PostalCodeResult>;
