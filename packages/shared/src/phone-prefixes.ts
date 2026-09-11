import type { PageResult } from './pagination.js';

export type PhonePrefixStatus = 'ACTIVE' | 'LEGACY' | 'INACTIVE';
export interface PhoneSource {
  publisher: string;
  official: boolean;
  publisherUrl: string | null;
  title: string | null;
  url: string | null;
  publishedAt: string | null;
  retrievedAt: string;
}
export interface PhoneMigration {
  oldPrefix: string;
  newPrefix: string;
  effectiveAt: string | null;
  source: PhoneSource;
}
export interface PhonePrefixResult {
  prefix: string;
  currentPrefix: string | null;
  status: PhonePrefixStatus;
  operator: { key: string; name: string; website: string | null };
  operatorResolution: 'PREFIX_ALLOCATION';
  currentSubscriberNetworkVerified: false;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  previousPrefixes: PhoneMigration[];
  replacement: PhoneMigration | null;
  source: PhoneSource;
  importedAt: string;
  updatedAt: string;
}
export interface PhonePrefixQuery {
  q?: string;
  prefix?: string;
  operator?: string;
  status?: PhonePrefixStatus;
  page?: number;
  pageSize?: number;
}
export type PhonePrefixPage = PageResult<PhonePrefixResult>;
