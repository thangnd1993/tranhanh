import { Prisma } from '../generated/prisma/client.js';

export interface SafeDatabaseError {
  statusCode: number;
  code: string;
  message: string;
}

export function mapDatabaseError(error: unknown): SafeDatabaseError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return { statusCode: 409, code: 'DATA_CONFLICT', message: 'A record with this identity already exists.' };
    }
    if (['P2003', 'P2014'].includes(error.code)) {
      return {
        statusCode: 409,
        code: 'DATA_RELATION_CONFLICT',
        message: 'This change conflicts with related records.',
      };
    }
    if (error.code === 'P2025') {
      return { statusCode: 404, code: 'DATA_NOT_FOUND', message: 'The requested record was not found.' };
    }
    if (['P1001', 'P1002', 'P1008', 'P1017', 'P2024', 'P2037'].includes(error.code)) {
      return { statusCode: 503, code: 'DATABASE_UNAVAILABLE', message: 'Data storage is temporarily unavailable.' };
    }
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return { statusCode: 503, code: 'DATABASE_UNAVAILABLE', message: 'Data storage is temporarily unavailable.' };
  }
  return { statusCode: 500, code: 'DATABASE_ERROR', message: 'The data operation could not be completed.' };
}
