import Joi from 'joi';

export interface AppEnvironment {
  API_HOST: string;
  API_PORT: number;
  AUTH_ACCESS_SECRET: string;
  AUTH_ACCESS_TTL_SECONDS: number;
  AUTH_COOKIE_SECURE: boolean;
  AUTH_REFRESH_TTL_SECONDS: number;
  AUTH_RESET_TTL_SECONDS: number;
  AUTH_TOKEN_PEPPER: string;
  DATABASE_URL: string;
  NODE_ENV: 'development' | 'test' | 'production';
  REDIS_HOST: string;
  REDIS_PASSWORD: string;
  REDIS_PORT: number;
  WEB_ORIGIN: string;
}

const unsafeSecrets = ['secret', 'changeme', 'password', 'test', 'development'];
const developmentAccessSecret = 'local-only-access-secret-change-before-production-2026';
const developmentTokenPepper = 'local-only-token-pepper-change-before-production-2026';

const schema = Joi.object<AppEnvironment>({
  API_HOST: Joi.string().hostname().default('0.0.0.0'),
  API_PORT: Joi.number().port().default(3000),
  AUTH_ACCESS_SECRET: Joi.string().min(32).default(developmentAccessSecret),
  AUTH_ACCESS_TTL_SECONDS: Joi.number().integer().min(300).max(3600).default(900),
  AUTH_COOKIE_SECURE: Joi.boolean().default(false),
  AUTH_REFRESH_TTL_SECONDS: Joi.number().integer().min(3600).max(7776000).default(2592000),
  AUTH_RESET_TTL_SECONDS: Joi.number().integer().min(300).max(86400).default(1800),
  AUTH_TOKEN_PEPPER: Joi.string().min(32).default(developmentTokenPepper),
  DATABASE_URL: Joi.string()
    .pattern(/^postgresql:\/\//)
    .default('postgresql://tranhanh:tranhanh@localhost:5432/tranhanh?schema=public'),
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  REDIS_HOST: Joi.string().hostname().default('localhost'),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_PORT: Joi.number().port().default(6379),
  WEB_ORIGIN: Joi.string().uri().default('http://localhost:4200'),
}).unknown(true);

export function validateEnvironment(input: Record<string, unknown>): AppEnvironment {
  const { error, value } = schema.validate(input, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    throw new Error(`Environment validation failed: ${error.message}`);
  }
  if (value.NODE_ENV === 'production') {
    const normalizedSecrets = [value.AUTH_ACCESS_SECRET, value.AUTH_TOKEN_PEPPER].map((secret) => secret.toLowerCase());
    if (
      !value.AUTH_COOKIE_SECURE ||
      normalizedSecrets.includes(developmentAccessSecret) ||
      normalizedSecrets.includes(developmentTokenPepper) ||
      normalizedSecrets.some((secret) => unsafeSecrets.some((unsafe) => secret === unsafe || secret.includes(unsafe)))
    ) {
      throw new Error('Environment validation failed: production authentication secrets/cookies are unsafe');
    }
    if (!value.WEB_ORIGIN.startsWith('https://')) {
      throw new Error('Environment validation failed: production WEB_ORIGIN must use HTTPS');
    }
  }

  return value;
}
