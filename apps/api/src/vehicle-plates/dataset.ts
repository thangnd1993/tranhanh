import Joi from 'joi';
import type { VehiclePlateAllocationStatus, VehiclePlateTargetType } from '@tranhanh/shared';
import { normalizeSearch } from '../common/normalize-search.js';
import { normalizeSourceUrl } from '../database/source-validation.js';

export interface VehiclePlateDataset {
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
  targets: {
    key: string;
    name: string;
    aliases: string[];
    type: VehiclePlateTargetType;
    isActive: boolean;
    referenceId: string;
  }[];
  allocations: {
    key: string;
    numericPrefix: string;
    seriesPrefix: string | null;
    targetKey: string;
    status: VehiclePlateAllocationStatus;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    referenceId: string;
  }[];
  history: {
    allocationKey: string;
    previousTargetKey: string;
    effectiveFrom: string | null;
    effectiveTo: string;
    sourceReferenceId: string;
    transitionReferenceId: string;
  }[];
  seriesPolicy: {
    referenceId: string;
    allocationResolution: 'NUMERIC_PREFIX_ONLY';
    allowedSeriesPattern: string;
  };
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
const name = Joi.string().max(250).required();
const aliases = Joi.array().max(8).unique().items(Joi.string().max(80)).required();
const prefix = Joi.string()
  .pattern(/^[1-9]\d$/)
  .required();
const series = Joi.string()
  .pattern(/^(?:[ABCDEFGHKLMNPSTUVXYZ](?:[ABCDEFGHKLMNPSTUVXYZ0-9])?|RM)$/)
  .allow(null)
  .required();
const url = Joi.string().max(2048).required();
const schema = Joi.object<VehiclePlateDataset>({
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
        publishedAt: Joi.string().isoDate().allow(null).required(),
        notes: Joi.string().max(2000).required(),
      }),
    )
    .required(),
  targets: Joi.array()
    .min(1)
    .items(
      Joi.object({
        key,
        name,
        aliases,
        type: Joi.string().valid('LOCALITY', 'CENTRAL_AUTHORITY').required(),
        isActive: Joi.boolean().required(),
        referenceId: id,
      }),
    )
    .required(),
  allocations: Joi.array()
    .min(1)
    .items(
      Joi.object({
        key,
        numericPrefix: prefix,
        seriesPrefix: series,
        targetKey: key,
        status: Joi.string().valid('ACTIVE', 'INACTIVE').required(),
        effectiveFrom: day,
        effectiveTo: day,
        referenceId: id,
      }),
    )
    .required(),
  history: Joi.array()
    .items(
      Joi.object({
        allocationKey: key,
        previousTargetKey: key,
        effectiveFrom: day,
        effectiveTo: Joi.string()
          .pattern(/^\d{4}-\d{2}-\d{2}$/)
          .required(),
        sourceReferenceId: id,
        transitionReferenceId: id,
      }),
    )
    .required(),
  seriesPolicy: Joi.object({
    referenceId: id,
    allocationResolution: Joi.string().valid('NUMERIC_PREFIX_ONLY').required(),
    allowedSeriesPattern: Joi.string()
      .valid('^(?:[ABCDEFGHKLMNPSTUVXYZ](?:[ABCDEFGHKLMNPSTUVXYZ0-9])?|RM)$')
      .required(),
  }).required(),
});

export class VehiclePlateDatasetError extends Error {}
function invariant(value: unknown, reason: string): asserts value {
  if (!value) throw new VehiclePlateDatasetError(`Invalid vehicle-plate dataset: ${reason}`);
}
function validDay(value: string | null): boolean {
  return value === null || (Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
}
export function validateVehiclePlateDataset(input: unknown): VehiclePlateDataset {
  const result = schema.validate(input, { convert: false, abortEarly: false });
  invariant(!result.error, 'invalid structure or field format');
  const data: VehiclePlateDataset = result.value;
  for (const values of [
    data.sources.map((r) => r.key),
    data.references.map((r) => r.id),
    data.targets.map((r) => r.key),
    data.allocations.map((r) => r.key),
    data.allocations.map((r) => `${r.numericPrefix}:${r.seriesPrefix ?? ''}`),
    data.history.map((r) => `${r.allocationKey}:${r.previousTargetKey}:${r.effectiveTo}`),
  ])
    invariant(new Set(values).size === values.length, 'duplicate identity');
  const sources = new Set(data.sources.map((r) => r.key));
  const refs = new Set(data.references.map((r) => r.id));
  const targets = new Map(data.targets.map((r) => [r.key, r]));
  const allocations = new Map(data.allocations.map((r) => [r.key, r]));
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
  invariant(refs.has(data.seriesPolicy.referenceId), 'missing series policy evidence');
  for (const target of data.targets) {
    invariant(refs.has(target.referenceId), 'missing target evidence');
    invariant(normalizeSearch([target.name, ...target.aliases].join(' ')).length <= 1000, 'search name too long');
    invariant(
      target.type !== 'CENTRAL_AUTHORITY' || target.key === 'cuc-canh-sat-giao-thong',
      'unexpected central authority',
    );
  }
  for (const item of data.allocations) {
    const target = targets.get(item.targetKey);
    invariant(target && refs.has(item.referenceId), 'missing allocation target or evidence');
    invariant(validDay(item.effectiveFrom) && validDay(item.effectiveTo), 'invalid allocation date');
    invariant(
      !item.effectiveFrom || !item.effectiveTo || item.effectiveFrom < item.effectiveTo,
      'invalid allocation interval',
    );
    if (item.status === 'ACTIVE') {
      invariant(target.isActive, 'active allocation points to inactive target');
      invariant(!item.effectiveFrom || Date.parse(item.effectiveFrom) <= Date.now(), 'future active allocation');
      invariant(!item.effectiveTo || Date.parse(item.effectiveTo) > Date.now(), 'expired active allocation');
    }
  }
  for (const item of data.history) {
    const allocation = allocations.get(item.allocationKey);
    invariant(allocation && targets.has(item.previousTargetKey), 'unknown historical endpoint');
    invariant(allocation.targetKey !== item.previousTargetKey, 'history repeats current target');
    invariant(refs.has(item.sourceReferenceId) && refs.has(item.transitionReferenceId), 'missing historical evidence');
    invariant(validDay(item.effectiveFrom) && validDay(item.effectiveTo), 'invalid history date');
    invariant(!item.effectiveFrom || item.effectiveFrom < item.effectiveTo, 'invalid history interval');
    invariant(
      !allocation.effectiveFrom || item.effectiveTo === allocation.effectiveFrom,
      'history/current boundary mismatch',
    );
  }
  const historyTargets = new Set(data.history.map((r) => r.previousTargetKey));
  invariant(
    data.targets.filter((r) => !r.isActive).every((r) => historyTargets.has(r.key)),
    'orphan inactive target',
  );
  return data;
}
