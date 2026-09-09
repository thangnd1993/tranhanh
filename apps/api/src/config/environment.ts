import Joi from 'joi';

export interface AppEnvironment {
  API_HOST: string;
  API_PORT: number;
  DATABASE_URL: string;
  NODE_ENV: 'development' | 'test' | 'production';
  REDIS_HOST: string;
  REDIS_PASSWORD: string;
  REDIS_PORT: number;
  WEB_ORIGIN: string;
}

const schema = Joi.object<AppEnvironment>({
  API_HOST: Joi.string().hostname().default('0.0.0.0'),
  API_PORT: Joi.number().port().default(3000),
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

  return value;
}
