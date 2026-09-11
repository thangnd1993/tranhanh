import { Controller, Get } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureDatabaseHttp } from '../src/database/configure-database-http.js';
import { Prisma } from '../src/generated/prisma/client.js';

// Test-only controller; no foundation data endpoints are added to the application.
@Controller('database-boundary-test')
class DatabaseBoundaryController {
  @Get('integer')
  integer(): { amount: bigint; values: bigint[] } {
    return { amount: 900719925474099312345n, values: [0n, -9007199254740993n] };
  }

  @Get('conflict')
  conflict(): never {
    throw new Prisma.PrismaClientKnownRequestError('secret driver detail', {
      code: 'P2002',
      clientVersion: '7.10.0',
      meta: { target: 'internal_field' },
    });
  }

  @Get('unavailable')
  unavailable(): never {
    throw new Prisma.PrismaClientInitializationError('secret connection detail', '7.10.0');
  }
}

describe('database HTTP boundaries', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [DatabaseBoundaryController],
    }).compile();
    app = module.createNestApplication<NestExpressApplication>();
    configureDatabaseHttp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('sends arbitrary integers as exact decimal strings over HTTP', async () => {
    const response = await request(app.getHttpServer()).get('/database-boundary-test/integer').expect(200);
    expect(response.body).toEqual({ amount: '900719925474099312345', values: ['0', '-9007199254740993'] });
  });

  it('maps Prisma conflicts through the registered global filter', async () => {
    const response = await request(app.getHttpServer()).get('/database-boundary-test/conflict').expect(409);
    expect(response.body).toEqual({
      statusCode: 409,
      code: 'DATA_CONFLICT',
      message: 'A record with this identity already exists.',
    });
  });

  it('returns a safe unavailable response without driver details', async () => {
    const response = await request(app.getHttpServer()).get('/database-boundary-test/unavailable').expect(503);
    expect(response.body.code).toBe('DATABASE_UNAVAILABLE');
    expect(response.text).not.toMatch(/secret|connection|stack|7\.10/);
  });
});
