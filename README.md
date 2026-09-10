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

## Roadmap and testing workflow

Current completed phase: Phase 4 — SEO Foundation.
Next phase: Phase 5 — Database Core.
Follow the [master specification](docs/MASTER_EXECUTION_PROMPT.md) and preserve completed phase history.
Roadmap changes require a documented architectural reason and explicit user instruction.

Every session must follow the permanent [low-resource testing strategy](docs/testing-strategy.md).
Keep required quality gates, using headless browser reuse, sequential viewport checks, selective screenshots,
and cleanup of temporary test resources.

## Bilingual routes and validation

Use `/vi` (default) or `/en`. The showcase is at `/vi/design-system` and `/en/design-system`.
The root redirects to `/vi`; URL locale takes precedence over any stored preference.
See [Localization architecture](docs/architecture.md#localization-phase-3) for translation and formatting conventions.
After `pnpm build`, run `pnpm test:ssr` for production SSR localization checks.
Optional headless browser configuration is documented in the architecture guide; no visible browser is required.

## SEO environment and checks

Keep `PUBLIC_ALLOW_INDEXING=false` locally and on staging. Before a public deployment, set `PUBLIC_SITE_URL` to the
actual HTTPS origin and explicitly set `PUBLIC_ALLOW_INDEXING=true`. No final domain is assumed. Pass these variables
to the SSR process; Node can load a local file explicitly with `--env-file=.env` when launched from the repository root.
Without an origin, canonical/alternate URL output is omitted and sitemap endpoints return 503 rather than invented URLs.
Run `pnpm test:seo` after `pnpm build` to verify production SSR metadata, sitemap/robots and HTTP 404 behavior using a test
origin. See [Technical SEO architecture](docs/architecture.md#technical-seo-phase-4) for policies and extension points.
