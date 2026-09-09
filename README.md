# TraNhanh

Cần biết gì, tra ngay.

TraNhanh is a Vietnamese-first, bilingual lookup and daily utility platform. This repository contains the
Phase 1 foundation: Angular SSR, a NestJS API, PostgreSQL through Prisma, Redis and BullMQ infrastructure,
shared TypeScript contracts, and local service definitions.

## Requirements

- Node.js 24.15.x; nvm reads .nvmrc.
- Corepack and pnpm 12.3.x.
- Docker Desktop or local PostgreSQL 18 and Redis 8 for dependency-backed development.

## Setup

    corepack enable
    pnpm install
    cp .env.example .env
    pnpm prisma:generate
    pnpm services:up
    pnpm dev

The web app runs at http://localhost:4200. The API runs at http://localhost:3000/api/v1,
with OpenAPI UI at http://localhost:3000/api/docs.

## Commands

| Command                                     | Purpose                                              |
| ------------------------------------------- | ---------------------------------------------------- |
| pnpm dev                                    | Run web and API watchers                             |
| pnpm dev:web / pnpm dev:api                 | Run one application                                  |
| pnpm build                                  | Build shared types, API, browser app, and SSR server |
| pnpm test / pnpm test:e2e                   | Run unit/component tests or API E2E tests            |
| pnpm lint                                   | Run ESLint with the 120-character limit              |
| pnpm format / pnpm format:check             | Write or verify Prettier formatting                  |
| pnpm prisma:generate / pnpm prisma:validate | Generate the client or validate its schema           |
| pnpm db:migrate / pnpm db:migrate:deploy    | Develop or deploy Prisma migrations                  |
| pnpm services:up / pnpm services:down       | Start or stop PostgreSQL and Redis                   |
| pnpm validate                               | Run the full non-container validation gate           |

## Repository map

- apps/web: Angular SSR/hybrid web application.
- apps/api: NestJS API with configuration, health, database, Redis, and queue foundations.
- apps/api/prisma/schema.prisma: PostgreSQL datasource and Prisma client generator.
- packages/shared: framework-neutral API contracts.
- .env.example: documented local environment.
- compose.yaml: development PostgreSQL and Redis services.
- docs/PROJECT_PROGRESS.md: source of truth for phase status and continuation.

No live data provider is configured, and no business feature from later phases is implemented.
