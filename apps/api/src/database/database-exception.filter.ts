import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '../generated/prisma/client.js';
import { mapDatabaseError } from './database-errors.js';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientRustPanicError,
)
export class DatabaseExceptionFilter implements ExceptionFilter {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const body = mapDatabaseError(exception);
    this.adapterHost.httpAdapter.reply(host.switchToHttp().getResponse(), body, body.statusCode);
  }
}
