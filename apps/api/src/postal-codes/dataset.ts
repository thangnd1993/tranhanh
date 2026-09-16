import Joi from 'joi';
import type { PostalCodeStatus, PostalCodeTargetType } from '@tranhanh/shared';
import { normalizeSearch } from '../common/normalize-search.js';
import { normalizeSourceUrl } from '../database/source-validation.js';
export interface PostalCodeDataset {
  version: number;
  standard: { country: 'VN'; codePattern: '^[0-9]{5}$'; codeLength: 5; effectiveFrom: string };
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
    type: PostalCodeTargetType;
    parentKey: string | null;
    isActive: boolean;
    referenceId: string;
  }[];
  assignments: {
    key: string;
    code: string;
    targetKey: string;
    status: PostalCodeStatus;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    referenceId: string;
  }[];
  sourceAnomalies: { sourceValue: string; targetKey: string; reason: string }[];
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
const schema = Joi.object<PostalCodeDataset>({
  version: Joi.number().valid(1).required(),
  standard: Joi.object({
    country: Joi.string().valid('VN').required(),
    codePattern: Joi.string().valid('^[0-9]{5}$').required(),
    codeLength: Joi.number().valid(5).required(),
    effectiveFrom: day,
  }).required(),
  sources: Joi.array()
    .min(1)
    .items(
      Joi.object({
        key,
        name: Joi.string().max(250).required(),
        homepageUrl: Joi.string().max(2048).required(),
        isOfficial: Joi.boolean().required(),
      }),
    )
    .required(),
  references: Joi.array()
    .min(1)
    .items(
      Joi.object({
        id,
        sourceKey: key,
        title: Joi.string().max(500).required(),
        url: Joi.string().max(2048).required(),
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
        name: Joi.string().max(250).required(),
        aliases: Joi.array().max(10).unique().items(Joi.string().max(100)).required(),
        type: Joi.string().valid('PROVINCE_CITY', 'WARD', 'COMMUNE', 'SPECIAL_ZONE').required(),
        parentKey: key.allow(null).required(),
        isActive: Joi.boolean().required(),
        referenceId: id,
      }),
    )
    .required(),
  assignments: Joi.array()
    .min(1)
    .items(
      Joi.object({
        key,
        code: Joi.string()
          .pattern(/^\d{5}$/)
          .required(),
        targetKey: key,
        status: Joi.string().valid('ACTIVE', 'INACTIVE').required(),
        effectiveFrom: day,
        effectiveTo: day,
        referenceId: id,
      }),
    )
    .required(),
  sourceAnomalies: Joi.array()
    .items(
      Joi.object({
        sourceValue: Joi.string().max(100).required(),
        targetKey: key,
        reason: Joi.string().max(500).required(),
      }),
    )
    .required(),
});
export class PostalCodeDatasetError extends Error {}
function invariant(value: unknown, reason: string): asserts value {
  if (!value) throw new PostalCodeDatasetError(`Invalid postal-code dataset: ${reason}`);
}
const validDay = (value: string | null) =>
  value === null || (Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
export function validatePostalCodeDataset(input: unknown): PostalCodeDataset {
  const result = schema.validate(input, { convert: false, abortEarly: false });
  invariant(!result.error, 'invalid structure or field format');
  const data: PostalCodeDataset = result.value;
  for (const values of [
    data.sources.map((x) => x.key),
    data.references.map((x) => x.id),
    data.targets.map((x) => x.key),
    data.assignments.map((x) => x.key),
    data.assignments.map((x) => `${x.code}:${x.targetKey}`),
  ])
    invariant(new Set(values).size === values.length, 'duplicate identity');
  const sources = new Set(data.sources.map((x) => x.key));
  const references = new Set(data.references.map((x) => x.id));
  const targets = new Map(data.targets.map((x) => [x.key, x]));
  for (const address of [...data.sources.map((x) => x.homepageUrl), ...data.references.map((x) => x.url)]) {
    try {
      normalizeSourceUrl(address);
    } catch {
      invariant(false, 'invalid public evidence URL');
    }
  }
  for (const reference of data.references) {
    invariant(sources.has(reference.sourceKey), 'unknown publisher');
    invariant(Date.parse(reference.retrievedAt) <= Date.now(), 'future retrieval');
    invariant(
      !reference.publishedAt || Date.parse(reference.publishedAt) <= Date.parse(reference.retrievedAt),
      'publication after retrieval',
    );
  }
  for (const target of data.targets) {
    invariant(references.has(target.referenceId), 'missing target evidence');
    invariant(normalizeSearch([target.name, ...target.aliases].join(' ')).length <= 1000, 'search name too long');
    invariant((target.type === 'PROVINCE_CITY') === (target.parentKey === null), 'invalid hierarchy depth');
    if (target.parentKey) invariant(targets.get(target.parentKey)?.type === 'PROVINCE_CITY', 'invalid parent target');
  }
  for (const assignment of data.assignments) {
    const target = targets.get(assignment.targetKey);
    invariant(target && target.type !== 'PROVINCE_CITY', 'invalid assignment target');
    invariant(references.has(assignment.referenceId), 'missing assignment evidence');
    invariant(validDay(assignment.effectiveFrom) && validDay(assignment.effectiveTo), 'invalid assignment date');
    invariant(
      !assignment.effectiveFrom || !assignment.effectiveTo || assignment.effectiveFrom < assignment.effectiveTo,
      'invalid assignment interval',
    );
  }
  const anomalyTargets = new Set(data.sourceAnomalies.map((x) => x.targetKey));
  for (const anomaly of data.sourceAnomalies) invariant(targets.has(anomaly.targetKey), 'unknown anomaly target');
  const assigned = new Set(data.assignments.map((x) => x.targetKey));
  invariant(
    data.targets
      .filter((x) => x.type !== 'PROVINCE_CITY')
      .every((x) => assigned.has(x.key) || anomalyTargets.has(x.key)),
    'unassigned target without documented source anomaly',
  );
  return data;
}
