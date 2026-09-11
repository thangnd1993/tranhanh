import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseExceptionFilter } from './database-exception.filter.js';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  exports: [PrismaService],
  providers: [PrismaService, { provide: APP_FILTER, useClass: DatabaseExceptionFilter }],
})
export class DatabaseModule {}
