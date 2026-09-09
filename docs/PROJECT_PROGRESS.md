# TraNhanh Project Progress

## Current Status

Current phase: Phase 1 — Project foundation
Status: Complete locally; push unavailable because no remote is configured
Last updated: 2026-09-09 (Asia/Ho_Chi_Minh)
Branch: main
Latest commit: Phase 1 checkpoint; resolve its hash with `git log -1 --oneline`.

## Completed Phases

### Phase 0 — Repository audit

Status: Complete (documentation-only scope; remote unavailable exception applies)

Implemented:

- Inspected workspace, parent instruction files, Git state, remotes, and installed tooling.
- Confirmed the repository initially contained only `.git`, with no commits or remote.
- Found no application, dependencies, existing documentation, or applicable AGENTS.md files.
- Preserved the original execution brief and created the resumable documentation set.
- No feature code was introduced, as required for Phase 0.

Database: Not created; no migrations apply to this phase.
API: Not implemented.
Frontend: Not implemented.
SEO: Requirements recorded; no public pages exist yet.
Responsive: Not applicable to documentation-only scope.
i18n: Vietnamese/English requirements recorded; no UI exists yet.

Tests and validation:

- Repository and tool availability checks executed.
- Documentation links, required files, UTF-8 readability, and progress sections checked.
- Authored documentation checked for trailing whitespace and lines over 120 characters.
- The preserved user brief is verbatim and exempt from authored-document formatting checks.
- Application tests, ESLint, Prettier, and production builds are not applicable until Phase 1
  installs the application and its tooling; no application checks are claimed as passed.

Commit: `chore: record repository audit and project requirements` (this checkpoint).
Push: Unavailable; `git remote -v` returned no remotes. No destination repository was supplied.

Known limitations:

- Docker CLI exists, but its daemon socket is absent; container checks cannot run yet.
- PostgreSQL and Redis executables were not found on PATH.
- No dependencies or framework compatibility have been validated yet.

### Phase 1 — Project foundation

Status: Complete (Docker runtime verification pending; daemon unavailable exception applies)

Implemented:

- Created a pnpm 12.3 workspace with apps/web, apps/api, and packages/shared.
- Selected Node 24.15.x, Angular 22.1.5 with Angular SSR 22.1.7, and NestJS 12.0.1.
- Added strict TypeScript, root ESLint and Prettier configuration, and a single pnpm lockfile.
- Added an Angular standalone shell with routing, SCSS, hydration, server output, and root prerendering.
- Added a NestJS ESM API under /api/v1, Swagger at /api/docs, CORS, and global DTO validation.
- Added Joi environment validation, documented defaults, .env.example, and Node/pnpm engine constraints.
- Added Prisma 7.10 with PostgreSQL, the pg driver adapter, generation, validation, and migration commands.
- Added Redis 8 lazy connectivity and global BullMQ configuration without premature queues or jobs.
- Added liveness and dependency-aware readiness endpoints with safe unavailable responses.
- Added PostgreSQL 18 and Redis 8 Compose services with persistence and health checks.
- Added shared health contracts and complete development, validation, build, migration, and service scripts.

Database:

- Prisma schema and migration directory are at apps/api/prisma.
- No business models or SQL migration were created in this foundation phase.
- Prisma client generation and schema validation passed.
- Live connectivity and migration execution are pending because PostgreSQL is unavailable.

API:

- Application: apps/api.
- Prefix: /api/v1.
- Liveness: GET /api/v1/health.
- Readiness: GET /api/v1/health/ready.
- OpenAPI UI: /api/docs.

Frontend and SSR:

- Application: apps/web.
- Production build generated browser and Express SSR bundles.
- The root route was prerendered with the Vietnamese H1 in emitted HTML.
- The production SSR server returned the rendered Vietnamese H1 in a live local request.
- No Phase 2 design-system or later business UI was started.

Tests and validation:

- Dependency installation and pnpm peer dependency validation passed.
- API unit tests: 6 passed across 3 files.
- Angular component test: 1 passed.
- API E2E liveness test: 1 passed.
- The built API served GET /api/v1/health successfully in a live local request.
- ESLint passed with zero warnings; Prettier check passed.
- Shared types, NestJS production build, and Angular browser/SSR production build passed.
- Prisma client generation and schema validation passed.
- Docker Compose static configuration validation passed.
- Environment validation defaults and invalid database URL behavior are covered by tests.

Docker:

- compose.yaml is statically valid.
- Docker runtime remains unverified because the daemon socket is unavailable.
- PostgreSQL and Redis runtime connectivity could not be tested and is recorded as pending.

Scripts:

- pnpm dev, dev:web, dev:api, build, lint, test, test:e2e, format, and format:check.
- pnpm prisma:generate, prisma:validate, db:migrate, and db:migrate:deploy.
- pnpm services:up, services:down, and validate.

Commit: `chore: initialize application foundation` (this checkpoint).
Push: Unavailable; no Git remote is configured.

Known limitations:

- Docker daemon, PostgreSQL, and Redis are unavailable, so runtime dependency checks remain pending.
- ESLint 9 is retained for current Angular ESLint compatibility and is reported deprecated upstream.
- No data provider, business schema, authentication, SEO system, or feature domain exists yet.

Quick continuation map:

- Web: apps/web
- API: apps/api
- Prisma: apps/api/prisma/schema.prisma and apps/api/prisma.config.ts
- Environment: .env.example and apps/api/src/config/environment.ts
- Services: compose.yaml
- Root commands: package.json

## Current Architecture Decisions

- Use the pnpm workspace and Node 24.15.x baseline created in Phase 1.
- Use Angular server output with prerendering for static routes and SSR for future dynamic routes.
- Keep infrastructure clients lazy so liveness works when dependencies are unavailable.
- Require sourced facts, versioned data, safe money arithmetic, bilingual UI, and SEO from inception.

## Active Data Providers

None. See `docs/data-sources.md` for the required provider registry fields.

## Environment Notes

- macOS workspace: `/Users/nhuphan/Documents/ChatGPT/tranhanh`.
- Required Node: 24.15.x; pnpm: 12.3.x.
- Docker CLI: 29.7.2; daemon unavailable at `/Users/nhuphan/.docker/run/docker.sock`.
- Git identity is configured. Initial branch: `main`; no remote configured.
- No credentials, provider accounts, or deployment destination were supplied.

## Pending Work

### Next Phase

Phase 2 — Design system. Create typography, spacing, color, form, button, card, navigation,
feedback-state, responsive layout, and light/dark/system theme foundations on a responsive showcase page.
Do not implement business features.

## Known Issues

- Push requires a configured remote URL and access.
- Database/container verification requires a running Docker daemon or equivalent services.
- ESLint 9 emits an upstream deprecation notice during installation; replacement requires compatibility review.

## Do Not Reimplement

- Do not repeat Phase 0 from scratch or overwrite the original project brief.
- Preserve this phase history and inspect repository evidence before continuing.
- Do not reinitialize the Angular, NestJS, Prisma, Redis, BullMQ, or pnpm foundations.
- Do not begin multiple major phases simultaneously or claim production readiness prematurely.
