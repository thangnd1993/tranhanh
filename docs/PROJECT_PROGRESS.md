# TraNhanh Project Progress

## Current Status

Current completed phase: Phase 2 — Design System
Next phase: Phase 3 — I18N Foundation
Status: Phase 2 complete; documentation/workflow correction only, no new implementation phase started
Last updated: 2026-09-10 (Asia/Ho_Chi_Minh)
Branch: main
Latest commit: Resolve the current local checkpoint with `git log -1 --oneline`.

## GitHub Connection

- Repository: https://github.com/thangnd1993/tranhanh
- Remote: `origin` — `git@github.com:thangnd1993/tranhanh.git` (fetch and push).
- Local branch: `main`; working tree was clean before configuring the remote.
- Initial Phase 1 commit: `4dd3e05 chore: initialize application foundation`.
- Push status: successful; all existing local history was pushed normally without force.
- Remote history: fetch and remote-ref inspection confirmed an empty repository before the initial push.
- Tracking branch: `main` tracks `origin/main`.
- Latest verified pushed commit before this documentation update: `68e978de28c7c368253e0647710ada5467c39a6f`.
- Phase 0 (`91e41f7`), Phase 1 (`4dd3e05`), and GitHub configuration (`68e978d`) are present on GitHub.
- SSH authentication: verified; authenticated account: `thangnd1993`.
- Previous SSH authentication blocker is resolved. No keys or SSH configuration were changed in this task.
- Synchronization checkpoint: `chore: record github synchronization` (this documentation commit).
- After pushing this checkpoint, resolve the latest pushed commit with `git rev-parse origin/main`.

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
Push: Initially unavailable; subsequently pushed successfully with the full history (see GitHub Connection).

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
Push: Successful; Phase 1 commit `4dd3e05` is included in `origin/main`.

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

### Phase 2 — Design system

Status: Complete

Implemented:

- Added semantic color, typography, spacing, radius, shadow, layout, and motion tokens.
- Added distinct light and dark themes plus a persisted system/light/dark preference with an SSR-safe prepaint script.
- Added responsive header, mobile navigation, footer, skip link, breadcrumbs, and a reusable page shell.
- Added reusable button, field, card, feedback, badge, skeleton, empty-state, data-table, and inline SVG icon patterns.
- Added `/design-system` as a lazy SSR showcase route with `noindex, nofollow` in HTML and the response header.
- Kept the root route as a restrained product shell; no business feature or fabricated factual data was introduced.
- Configured Angular's explicit zoneless change detection and deterministic menu view updates for hydrated SSR interaction.

Accessibility and responsive verification:

- Keyboard menu open/close, Escape focus restoration, form labels, visible focus, semantic landmarks, and reduced motion are covered.
- Browser checks passed at 320, 375, 390, 430, 768, 1024, 1280, and 1440 pixels with no horizontal overflow.
- Light mobile and dark desktop renders were inspected visually.
- Theme selection persists in local storage and updates the document theme.

Tests and validation:

- Angular tests: 4 passed across 3 files, including theme persistence/resolution and mobile navigation behavior.
- ESLint, Prettier, workspace tests, API E2E, Prisma validation, and all production builds passed.
- Final browser bundle: 283.75 kB initial raw, 78.39 kB estimated transfer; showcase is lazy-loaded.
- Live SSR checks confirmed the showcase title and `noindex, nofollow` metadata.

Commit: `feat: add responsive design system` (this checkpoint).
Push: Intended for `origin/main`; verify the resulting hash with `git rev-parse origin/main`.

Known limitations:

- Language switching remains a visible placeholder for a later localization phase.
- Header product areas remain labeled as upcoming until their dedicated phases.
- Docker-backed runtime verification remains pending from Phase 1.

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
- Git identity is configured. Branch: `main`; GitHub SSH remote is configured (see GitHub Connection).
- No credentials, provider accounts, or deployment destination were supplied.

## Pending Work

### Next Phase

Next phase: Phase 3 — I18N Foundation

The master specification defines this order:

1. Phase 3 — I18N Foundation
2. Phase 4 — SEO Foundation
3. Phase 5 — Database Core

Do not rename or reorder phases without both a documented architectural reason and explicit user instruction.

## Permanent Testing Workflow

Every subsequent session must follow [Testing strategy](testing-strategy.md): headless by default, preferably one
browser process with safe context/page reuse, sequential viewport checks, and selective screenshots at 390px,
768px when relevant, and 1440px. Clean up test-owned processes and temporary screenshots after validation.
Backend phases normally need no browser testing unless frontend behavior changes. Required quality gates remain intact.

Workflow checkpoint: `docs: refine testing workflow and roadmap`.
This documentation-only correction preserves completed history and starts no implementation phase.
Validation: documentation formatting, diff/scope review, and Git synchronization; no browser visual audit.

## Known Issues

- No remaining GitHub synchronization blocker; SSH access is verified for `thangnd1993`.
- Database/container verification requires a running Docker daemon or equivalent services.
- ESLint 9 emits an upstream deprecation notice during installation; replacement requires compatibility review.

## Do Not Reimplement

- Do not repeat Phase 0 from scratch or overwrite the original project brief.
- Preserve this phase history and inspect repository evidence before continuing.
- Do not reinitialize the Angular, NestJS, Prisma, Redis, BullMQ, or pnpm foundations.
- Do not begin multiple major phases simultaneously or claim production readiness prematurely.
- Do not recreate the Phase 2 design tokens, themes, primitives, responsive shell, or showcase route.
