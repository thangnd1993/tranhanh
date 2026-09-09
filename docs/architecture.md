# Architecture

## Monorepo

TraNhanh uses a pnpm workspace with independently buildable applications and a small shared contract package:

    apps/web/              Angular 22 SSR/hybrid application
    apps/api/              NestJS 12 REST API
    apps/api/prisma/       Prisma 7 schema and migration history
    packages/shared/       Framework-neutral TypeScript response contracts
    docs/                  Project decisions and progress
    compose.yaml           PostgreSQL 18 and Redis 8 development services

Empty configuration, lint, and type packages were omitted. Root files own repository-wide configuration until
multiple packages need a separately versioned configuration.

## Web

The Angular application uses standalone APIs, strict TypeScript, routing, SCSS, hydration, and the Angular
application builder in server output mode. The root route is prerendered during production builds and an Express
SSR entry is produced for future dynamic routes. Phase 1 contains only an accessible product shell.

## API

NestJS runs as an ESM application under the /api/v1 prefix. Swagger is exposed at /api/docs. Global DTO
validation rejects non-whitelisted input. CORS accepts the configured web origin.

GET /api/v1/health is a process liveness probe and never depends on infrastructure. GET /api/v1/health/ready
checks PostgreSQL and Redis, returning HTTP 503 and a safe per-dependency status if either is unavailable.

## Configuration and infrastructure

Nest configuration validates environment variables through Joi at startup. Development defaults mirror
.env.example; deployment values remain environment-controlled. Prisma uses PostgreSQL through the official
pg driver adapter and creates connections lazily. No business model or SQL migration exists in Phase 1.

Redis uses a lazy client for readiness and future cache access. BullMQ is configured globally with the same
Redis connection, but no queues or jobs are registered until provider phases require them.

Development services use persistent named volumes and health checks in compose.yaml. Runtime container,
database, Redis, and migration-connectivity verification remains pending while the Docker daemon is unavailable.

## Data and money rules

Providers must validate and normalize data before storage. Public requests must not call external providers on
every visit. Use integer-safe or decimal arithmetic for money, effective dates for tariffs and administrative
mappings, and safe API serialization. Never generate factual values using AI.
