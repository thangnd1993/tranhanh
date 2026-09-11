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
- apps/api/prisma/schema.prisma: core source/provider/sync/evidence/localized SEO schema.
- packages/shared: framework-neutral API contracts.
- .env.example: documented local environment.
- compose.yaml: development PostgreSQL and Redis services.
- docs/PROJECT_PROGRESS.md: source of truth for phase status and continuation.

No external provider is queried at runtime. The phone-prefix backend reads explicitly imported reviewed data.

## Roadmap and testing workflow

Current completed phase: Phase 7 — Phone Prefix Frontend + SEO (live database verification pending).
Next phase: Phase 8 — Area Code Backend.
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

## Core database workflow

Prisma CLI and API both load the repository-root `.env`; exported values take precedence. Confirm DATABASE_URL points
to the intended local development database before migration. When Docker Desktop is running:

    pnpm services:up
    pnpm db:migrate:deploy
    pnpm db:seed

The foundation seed stays empty and does not connect or insert data. Phone-prefix data uses the separate import below.
PostgreSQL 18 uses the /var/lib/postgresql volume layout; existing volumes are preserved, not automatically upgraded.
For a new isolated test database, create it once (the command fails harmlessly if it already exists; do not drop it):

    docker compose exec postgres createdb -U tranhanh tranhanh_test
    TEST_DATABASE_URL=postgresql://tranhanh:tranhanh@localhost:5432/tranhanh_test pnpm test:database

The runner refuses production mode, non-loopback hosts, non-test database names, and non-public schemas. It applies
migrations to that explicit test database, runs integration checks sequentially, and rolls back all test fixtures.
It never falls back to DATABASE_URL and never resets/drops an existing database. Credentials above are local Compose
fixture credentials only. Database tests are intentionally separate from `pnpm test` so unavailable infrastructure is
reported as pending, not replaced by mocked database constraint success.

After starting the API, verify `/api/v1/health` and `/api/v1/health/ready`. Readiness should report both dependencies as ok;
503 means a real dependency remains unavailable. You can also check Redis with `docker compose exec redis redis-cli ping`.
Current Phase 5 verification covers schema generation/validation, SQL review, non-database tests, and production builds;
live PostgreSQL migration, constraint tests, Redis connectivity, and successful readiness remain pending (Docker unavailable).
See [Database migration notes](apps/api/prisma/migrations/README.md) for the reviewed migration and SQL-only CHECK rules.

## Phone-prefix data commands

    pnpm --filter @tranhanh/api phone-prefixes:validate
    pnpm db:migrate:deploy
    pnpm --filter @tranhanh/api phone-prefixes:import

The first command needs no database. Import requires explicit DATABASE_URL pointing at the intended database; it loads the
reviewed file and never runs automatically at API startup. Apply both migrations first. `pnpm test:database` runs Phase 5
and Phase 6 constraints against the guarded local test database. Source coverage and update instructions are in
[data sources](docs/data-sources.md#phone-prefix-dataset--phase-6); API routes are documented at /api/docs.

## Phone-prefix frontend (Phase 7)

Public routes are `/vi/tra-cuu/dau-so`, `/en/lookup/phone-prefix` and their `/:prefix` detail routes.
The web server requires a reachable, migrated/imported API for real answers. There is no production fixture fallback.
`API_ORIGIN` is a server-only HTTP(S) origin, defaulting to `http://127.0.0.1:3000` for local development.
It must have no credentials, path, query or fragment. Export it for the SSR process; `.env.example` is a template,
not automatically loaded by the web server. The browser uses the web server's scoped same-origin API gateway.
The Angular development server uses `apps/web/proxy.conf.json` for the local API on port 3000.

    pnpm build
    API_ORIGIN=http://127.0.0.1:3000 pnpm --filter @tranhanh/web serve:ssr
    pnpm test:phone

`test:phone` starts a test-only HTTP adapter using reviewed backend fixtures and the backend number normalizer.
It checks production SSR/SEO and sitemap behavior without claiming database integration. Build both apps first.
For the single-browser headless checks, set `PLAYWRIGHT_MODULE` to an installed Playwright module and optionally
`CHROME_EXECUTABLE` to Chrome. `PHONE_SCREENSHOTS` optionally names a temporary screenshot folder; inspect then remove it.
No browser dependency is added to production. Existing `test:ssr` and `test:seo` remain regression gates.

Production deployments should configure `API_ORIGIN`, `PUBLIC_SITE_URL`, and `PUBLIC_ALLOW_INDEXING` explicitly.
Do not log lookup query strings in reverse proxies/APM: the existing backend lookup protocol uses a GET value parameter.
The application clears submitted numbers, does not store search history, and uses no-store/no-referrer requests.
Only normalized prefix URLs enter browser navigation. Sitemap generation reads the real API and omits the phone segment
when its catalogue is unavailable or empty; direct requests to that unavailable segment return 503.
