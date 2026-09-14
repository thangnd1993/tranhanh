import Joi from 'joi';
import { normalizeSourceUrl } from '../database/source-validation.js';
import { normalizeSearch } from '../common/normalize-search.js';
import type { AreaCodeStatus } from '@tranhanh/shared';

export interface AreaDataset {
  version: number;
  sources: { key: string; name: string; homepageUrl: string; isOfficial: boolean }[];
  references: {
    id: string;
    sourceKey: string;
    title: string;
    url: string;
    retrievedAt: string;
    publishedAt: string | null;
    notes: string;
  }[];
  groups: { key: string; name: string; aliases: string[]; effectiveFrom: string | null; referenceId: string }[];
  localities: {
    key: string;
    name: string;
    aliases: string[];
    isActive: boolean;
    groupKey: string;
    referenceId: string;
  }[];
  codes: {
    code: string;
    localityKey: string;
    status: AreaCodeStatus;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    referenceId: string;
  }[];
  migrations: { oldCode: string; newCode: string; effectiveDate: string | null; referenceId: string }[];
}
const key = Joi.string()
  .pattern(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .max(100)
  .required();
const id = Joi.string().uuid({ version: 'uuidv4' }).required();
const day = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .allow(null)
  .required();
const instant = Joi.string().isoDate().allow(null).required();
const name = Joi.string().max(250).required();
const aliases = Joi.array().max(8).unique().items(Joi.string().max(80)).required();
const code = Joi.string()
  .pattern(/^0[1-9]\d{0,2}$/)
  .required();
const url = Joi.string().max(2048).required();
const schema = Joi.object<AreaDataset>({
  version: Joi.number().valid(1).required(),
  sources: Joi.array()
    .min(1)
    .items(Joi.object({ key, name, homepageUrl: url, isOfficial: Joi.boolean().required() }))
    .required(),
  references: Joi.array()
    .min(1)
    .items(
      Joi.object({
        id,
        sourceKey: key,
        title: Joi.string().max(500).required(),
        url,
        retrievedAt: Joi.string().isoDate().required(),
        publishedAt: instant,
        notes: Joi.string().max(2000).required(),
      }),
    )
    .required(),
  groups: Joi.array()
    .min(1)
    .items(Joi.object({ key, name, aliases, effectiveFrom: day, referenceId: id }))
    .required(),
  localities: Joi.array()
    .min(1)
    .items(Joi.object({ key, name, aliases, isActive: Joi.boolean().required(), groupKey: key, referenceId: id }))
    .required(),
  codes: Joi.array()
    .min(1)
    .items(
      Joi.object({
        code,
        localityKey: key,
        status: Joi.string().valid('ACTIVE', 'LEGACY', 'INACTIVE').required(),
        effectiveFrom: day,
        effectiveTo: day,
        referenceId: id,
      }),
    )
    .required(),
  migrations: Joi.array()
    .items(Joi.object({ oldCode: code, newCode: code, effectiveDate: day, referenceId: id }))
    .required(),
});
export class AreaDatasetError extends Error {}
function invariant(value: unknown, reason: string): asserts value {
  if (!value) throw new AreaDatasetError(`Invalid area-code dataset: ${reason}`);
}
function validDay(value: string | null): boolean {
  return value === null || (Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
}
export function validateAreaDataset(input: unknown): AreaDataset {
  const result = schema.validate(input, { convert: false, abortEarly: false });
  invariant(!result.error, 'invalid structure or field format');
  const data: AreaDataset = result.value;
  for (const values of [
    data.sources.map((r) => r.key),
    data.references.map((r) => r.id),
    data.groups.map((r) => r.key),
    data.localities.map((r) => r.key),
    data.codes.map((r) => r.code),
    data.migrations.map((r) => r.oldCode),
  ]) {
    invariant(new Set(values).size === values.length, 'duplicate identity');
  }
  const sources = new Set(data.sources.map((r) => r.key));
  const refs = new Set(data.references.map((r) => r.id));
  const groups = new Map(data.groups.map((r) => [r.key, r]));
  const localities = new Map(data.localities.map((r) => [r.key, r]));
  const codes = new Map(data.codes.map((r) => [r.code, r]));
  for (const address of [...data.sources.map((r) => r.homepageUrl), ...data.references.map((r) => r.url)]) {
    try {
      normalizeSourceUrl(address);
    } catch {
      invariant(false, 'invalid public evidence URL');
    }
  }
  for (const ref of data.references) {
    invariant(sources.has(ref.sourceKey), 'unknown publisher');
    invariant(Date.parse(ref.retrievedAt) <= Date.now(), 'future retrieval');
    invariant(
      !ref.publishedAt || Date.parse(ref.publishedAt) <= Date.parse(ref.retrievedAt),
      'publication after retrieval',
    );
  }
  for (const item of [...data.localities, ...data.groups]) {
    invariant(refs.has(item.referenceId), 'missing locality evidence');
    invariant(normalizeSearch([item.name, ...item.aliases].join(' ')).length <= 1000, 'search name too long');
  }
  for (const item of data.localities) invariant(groups.has(item.groupKey), 'unknown telecom group');
  for (const item of data.groups) {
    invariant(validDay(item.effectiveFrom), 'invalid group date');
    invariant(!item.effectiveFrom || Date.parse(item.effectiveFrom) <= Date.now(), 'future grouping is not current');
  }
  for (const item of data.codes) {
    invariant(localities.has(item.localityKey) && refs.has(item.referenceId), 'missing locality or evidence');
    invariant(validDay(item.effectiveFrom) && validDay(item.effectiveTo), 'invalid allocation date');
    invariant(
      !item.effectiveFrom || !item.effectiveTo || item.effectiveFrom < item.effectiveTo,
      'invalid effective interval',
    );
    if (item.status === 'ACTIVE') {
      invariant(/^02\d{1,2}$/.test(item.code), 'active geographic code must be in the reviewed 02 range');
      invariant(localities.get(item.localityKey)?.isActive, 'inactive service area');
      invariant(!item.effectiveFrom || Date.parse(item.effectiveFrom) <= Date.now(), 'future active allocation');
      invariant(!item.effectiveTo || Date.parse(item.effectiveTo) > Date.now(), 'expired active allocation');
    }
  }
  for (const item of data.migrations) {
    const old = codes.get(item.oldCode);
    const current = codes.get(item.newCode);
    invariant(
      item.oldCode !== item.newCode && old?.status === 'LEGACY' && current?.status === 'ACTIVE',
      'invalid migration endpoints',
    );
    invariant(
      old.localityKey === current.localityKey && refs.has(item.referenceId),
      'migration locality/evidence mismatch',
    );
    invariant(
      validDay(item.effectiveDate) && (!item.effectiveDate || Date.parse(item.effectiveDate) <= Date.now()),
      'invalid transition date',
    );
    invariant(
      !item.effectiveDate || !current.effectiveFrom || item.effectiveDate === current.effectiveFrom,
      'transition differs from target start',
    );
    invariant(
      !item.effectiveDate || !old.effectiveTo || old.effectiveTo >= item.effectiveDate,
      'legacy ended before transition',
    );
  }
  invariant(
    data.codes.filter((r) => r.status === 'LEGACY').length === data.migrations.length,
    'every legacy code needs one replacement',
  );
  return data;
}
