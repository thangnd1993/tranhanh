import Joi from 'joi';
import { normalizeSourceUrl } from '../database/source-validation.js';

export interface PrefixDataset {
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
  operators: { key: string; name: string; website: string; isActive: boolean; referenceId: string }[];
  prefixes: {
    prefix: string;
    operatorKey: string;
    status: 'ACTIVE' | 'LEGACY' | 'INACTIVE';
    effectiveFrom: string | null;
    effectiveTo: string | null;
    referenceId: string;
  }[];
  migrations: { oldPrefix: string; newPrefix: string; effectiveAt: string | null; referenceId: string }[];
}

const key = Joi.string()
  .pattern(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .max(100)
  .required();
const id = Joi.string().uuid({ version: 'uuidv4' }).required();
const instant = Joi.string().isoDate().allow(null).required();
const url = Joi.string().max(2048).required();
const schema = Joi.object<PrefixDataset>({
  version: Joi.number().valid(1).required(),
  sources: Joi.array()
    .min(1)
    .items(
      Joi.object({
        key,
        name: Joi.string().max(250).required(),
        homepageUrl: url,
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
        url,
        retrievedAt: Joi.string().isoDate().required(),
        publishedAt: instant,
        notes: Joi.string().max(2000).required(),
      }),
    )
    .required(),
  operators: Joi.array()
    .min(1)
    .items(
      Joi.object({
        key,
        name: Joi.string().max(250).required(),
        website: url,
        isActive: Joi.boolean().required(),
        referenceId: id,
      }),
    )
    .required(),
  prefixes: Joi.array()
    .min(1)
    .items(
      Joi.object({
        prefix: Joi.string()
          .pattern(/^0\d{2,3}$/)
          .required(),
        operatorKey: key,
        status: Joi.string().valid('ACTIVE', 'LEGACY', 'INACTIVE').required(),
        effectiveFrom: instant,
        effectiveTo: instant,
        referenceId: id,
      }),
    )
    .required(),
  migrations: Joi.array()
    .items(
      Joi.object({
        oldPrefix: Joi.string().required(),
        newPrefix: Joi.string().required(),
        effectiveAt: instant,
        referenceId: id,
      }),
    )
    .required(),
});

export class DatasetValidationError extends Error {}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new DatasetValidationError(`Invalid phone-prefix dataset: ${message}`);
  }
}
function unique(values: string[]): void {
  invariant(new Set(values).size === values.length, 'duplicate identity');
}

export function validateDataset(input: unknown): PrefixDataset {
  const result = schema.validate(input, { convert: false, abortEarly: false });
  invariant(!result.error, 'invalid structure or field format');
  const data: PrefixDataset = result.value;
  for (const values of [
    data.sources.map((x) => x.key),
    data.references.map((x) => x.id),
    data.operators.map((x) => x.key),
    data.prefixes.map((x) => x.prefix),
    data.migrations.map((x) => x.oldPrefix),
  ]) {
    unique(values);
  }
  const sources = new Set(data.sources.map((x) => x.key));
  const refs = new Set(data.references.map((x) => x.id));
  const operators = new Map(data.operators.map((x) => [x.key, x]));
  const prefixes = new Map(data.prefixes.map((x) => [x.prefix, x]));
  for (const value of [
    ...data.sources.map((x) => x.homepageUrl),
    ...data.references.map((x) => x.url),
    ...data.operators.map((x) => x.website),
  ]) {
    try {
      normalizeSourceUrl(value);
    } catch {
      invariant(false, 'invalid public source URL');
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
  for (const operator of data.operators) {
    invariant(refs.has(operator.referenceId), 'unknown operator evidence');
  }
  for (const prefix of data.prefixes) {
    invariant(operators.has(prefix.operatorKey) && refs.has(prefix.referenceId), 'missing operator or evidence');
    invariant(
      prefix.status === 'LEGACY' ? /^01[2689]\d$/.test(prefix.prefix) : /^0[35789]\d$/.test(prefix.prefix),
      'status and prefix length mismatch',
    );
    invariant(
      !prefix.effectiveTo ||
        (prefix.effectiveFrom && Date.parse(prefix.effectiveTo) > Date.parse(prefix.effectiveFrom)),
      'invalid effective interval',
    );
    if (prefix.status === 'ACTIVE') {
      invariant(operators.get(prefix.operatorKey)?.isActive, 'active prefix has inactive operator');
      invariant(!prefix.effectiveFrom || Date.parse(prefix.effectiveFrom) <= Date.now(), 'future active allocation');
      invariant(!prefix.effectiveTo || Date.parse(prefix.effectiveTo) > Date.now(), 'expired active allocation');
    }
  }
  for (const mapping of data.migrations) {
    const old = prefixes.get(mapping.oldPrefix);
    const current = prefixes.get(mapping.newPrefix);
    invariant(old?.status === 'LEGACY' && current?.status === 'ACTIVE', 'invalid migration endpoints');
    invariant(old.operatorKey === current.operatorKey && refs.has(mapping.referenceId), 'migration relation mismatch');
    invariant(!mapping.effectiveAt || Date.parse(mapping.effectiveAt) <= Date.now(), 'future historical conversion');
    invariant(
      !mapping.effectiveAt ||
        !current.effectiveFrom ||
        Date.parse(mapping.effectiveAt) >= Date.parse(current.effectiveFrom),
      'conversion before target allocation',
    );
  }
  invariant(
    data.prefixes.filter((x) => x.status === 'LEGACY').length === data.migrations.length,
    'every legacy prefix must have exactly one replacement',
  );
  return data;
}
