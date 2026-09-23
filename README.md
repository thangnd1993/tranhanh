# TraNhanh

Trợ lý cho tài xế và phương tiện.

TraNhanh is the working label for a Vietnamese-first, bilingual automotive information platform for drivers,
vehicle owners, and families managing vehicles. Public source-backed tools remain available without an account;
future private features will support saved vehicles, monitoring, reminders, maintenance, fuel, and expenses.
The repository combines Angular SSR, NestJS, Prisma/PostgreSQL, Redis/BullMQ, and shared TypeScript contracts.

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
- docs/product-direction.md: automotive product vision, feature disposition, boundaries, and roadmap.

No external provider is queried at runtime. Dataset-backed public lookups use explicitly imported, reviewed data. Traffic Fine Lookup currently returns a transparent manual-verification outcome because no documented official automation API was verified and the official lookup requires CAPTCHA.

## Roadmap and testing workflow

Current completed phase: Phase 23 — Driver Dashboard.
Current phase: Phase 23 — Driver Dashboard (complete).
Next phase: Phase 24 — Notification Center (not started).
The user-authorized automotive pivot supersedes the old post-Phase 12 general-utility roadmap while preserving all
completed history. See [product direction](docs/product-direction.md) and [project progress](docs/PROJECT_PROGRESS.md).

Every session must follow the permanent [low-resource testing strategy](docs/testing-strategy.md).
Keep required quality gates, using headless browser reuse, sequential viewport checks, selective screenshots,
and cleanup of temporary test resources.

## Bilingual routes and validation

Use `/vi` (default) or `/en`. Traffic Fine Lookup is available at `/vi/tra-cuu/phat-nguoi` and
`/en/lookup/traffic-fines`; it keeps submitted plates out of URLs and guides users through official manual CAPTCHA
verification. The showcase is at `/vi/design-system` and `/en/design-system`.
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
Local runtime verification was completed against Docker PostgreSQL 18 and Redis 8. After creating a clean isolated
`tranhanh_test`, run the database suite before importing lookup datasets, then run the live application/queue suite:

    TEST_DATABASE_URL=postgresql://tranhanh:tranhanh@localhost:5432/tranhanh_test?schema=public pnpm test:database
    DATABASE_URL=postgresql://tranhanh:tranhanh@localhost:5432/tranhanh_test?schema=public NODE_ENV=test pnpm test:runtime

The runtime command refuses production mode, remote hosts, non-test database names, and non-public schemas. It expects the
four reviewed lookup datasets to be imported and Redis to be reachable. It never calls CSGT automatically. See
[Database migration notes](apps/api/prisma/migrations/README.md) for the reviewed migrations and SQL-only CHECK rules.

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

## Area-code data commands

    pnpm --filter @tranhanh/api area-codes:validate
    pnpm db:migrate:deploy
    pnpm --filter @tranhanh/api area-codes:import

Validation needs no database. Import requires explicit DATABASE_URL and the additive Phase 8 migration; it never runs
at startup. Existing `pnpm test:database` discovers the new area-code tests along with earlier pending DB checks against
an explicitly configured local `tranhanh_test` database. Never reset an existing database to run fixtures.

The API is under `/api/v1/area-codes`; Swagger documents normalized code lookup, fixed-line input and scoped search.
See [area-code sources](docs/data-sources.md#fixed-line-area-code-dataset--phase-8) for source-era names, parallel codes,
transition dates and the maintenance workflow. Docker runtime verification is still pending; no new frontend is included.

## Area-code frontend (Phase 9)

Public SSR routes are /vi/tra-cuu/ma-vung and /en/lookup/area-code, including verified current and legacy detail pages.
Build both apps before running the isolated SSR, SEO, sitemap, privacy, and optional headless responsive checks:

    pnpm test:area

The optional PLAYWRIGHT_MODULE, CHROME_EXECUTABLE, and AREA_SCREENSHOTS variables enable the single-browser responsive
and light/dark checks. Sitemap generation omits only an unavailable vertical and keeps other healthy segments.

## Vehicle-plate data commands

    pnpm --filter @tranhanh/api vehicle-plates:validate
    pnpm db:migrate:deploy
    pnpm --filter @tranhanh/api vehicle-plates:import

The API is under `/api/v1/vehicle-plates`. Validation is database-free; import requires the additive Phase 10 migration
and an explicitly configured DATABASE_URL. Lookup accepts public prefix/series input and selected full-plate formats,
but discards the registration serial before querying. It returns allocation facts only and does not identify a vehicle
or owner. See [vehicle-plate sources](docs/data-sources.md#vehicle-plate-allocation-dataset--phase-10).

## Vehicle-plate frontend (Phase 11)

Public routes: `/vi/tra-cuu/bien-so` and `/en/lookup/vehicle-plate`, with `/:prefix` details.
Build both apps then run `pnpm test:vehicle` for the isolated API-adapter SSR/SEO/sitemap checks.
Optional PLAYWRIGHT_MODULE, CHROME_EXECUTABLE and VEHICLE_SCREENSHOTS enable sequential headless responsive and theme
checks. Test adapters never supply production fallback data. Real answers require the pending migrations and import.
Numeric allocation pages enter the sitemap; generic series variants use a numeric canonical and noindex.

## Authentication foundation (Phase 13)

Authentication is optional; Vehicle Plate, Phone Prefix, and Area Code lookups remain anonymous. Localized routes are
`/vi/dang-nhap`, `/vi/dang-ky`, `/vi/tai-khoan` and `/en/login`, `/en/register`, `/en/account`. Forgot/reset routes are
also localized and every auth/account page is `noindex, nofollow` and excluded from sitemaps.

The API exposes register, login, refresh, logout, me/profile, password change, forgot/reset, and account-deletion request
endpoints under `/api/v1/auth`. Passwords use Argon2id. Short-lived access JWTs and rotating refresh capabilities use
HttpOnly, SameSite=Strict cookies for web; only HMAC-SHA-256 refresh/reset/CSRF hashes are persisted. The access JWT carries
only user/session identifiers and standard timing claims. Refresh reuse revokes its session family. Password reset tokens
are one-time, expiring, delivered by an abstraction, and never logged. Development/test delivery stays in process memory;
production needs a reviewed email adapter before password-reset delivery is operational.

State-changing cookie-authenticated calls require a session-bound CSRF header/cookie and trusted Origin when supplied.
Credentialed CORS accepts only `WEB_ORIGIN`. Auth endpoints have scoped in-memory rate limits; anonymous lookup endpoints
are unaffected. Production startup requires HTTPS, Secure cookies, and independent non-default access/token secrets. See
`.env.example` and [authentication architecture](docs/architecture.md#authentication--phase-13). Expired/revoked security
records are cleaned opportunistically after a 30-day audit window; a multi-instance deployment should move rate counters
to shared infrastructure.

## Postal-code data commands

    pnpm postal-codes:validate
    pnpm db:migrate:deploy
    pnpm postal-codes:import

The API is under `/api/v1/postal-codes`. The reviewed Phase 12 snapshot follows the current five-character national
standard and the 2025 two-tier locality amendment. Validation needs no database; import requires the additive migration
and an explicit `DATABASE_URL`. One invalid value in the official annex remains a documented unassigned target rather than
being silently truncated. See [postal-code sources](docs/data-sources.md#national-postal-code-dataset--phase-12).

## Vehicle Monitoring (Phase 17)

Authenticated Garage vehicle details expose private traffic-fine monitoring preference and history. The current official
CSGT source is manual-only and CAPTCHA-protected, so saving the preference does not start background checks. Private APIs
are nested under `/api/v1/vehicles/:vehicleId/monitoring`; automated providers are capability-gated and would use BullMQ
jobs containing only an opaque monitoring ID. PostgreSQL/Redis runtime verification remains pending while Docker is
unavailable. See [Vehicle Monitoring architecture](docs/architecture.md#vehicle-monitoring--phase-17).

## Fuel Prices (Phase 19)

Public routes are `/vi/gia-xang` and `/en/fuel-prices`; APIs are `GET /api/v1/fuel-prices/current` and
`GET /api/v1/fuel-prices/history`. Values are official maximum retail prices, not live station quotes. Apply migrations and
load the reviewed Ministry publications with:

    pnpm db:migrate:deploy
    pnpm fuel-prices:import

Run `pnpm test:fuel` while the built local API/SSR stack is running to check raw prices, sources, metadata and sitemap entries. The import is manual, validated and idempotent; no scheduled scraper or BullMQ fuel-price queue is enabled. Prices use exact
PostgreSQL BIGINT and JSON decimal strings. See [fuel-price sources](docs/data-sources.md#vietnam-fuel-price-publications--phase-19)
for semantics, product coverage, current publication and maintenance policy.

## Fuel Log

Authenticated vehicle owners can open the localized private Fuel Log at /vi/garage/:id/nhien-lieu or /en/garage/:id/fuel-log. Entries store exact liters and total VND, support historical correction and archive/restore, and calculate economy only across completed full-tank intervals. Public fuel prices are reference data only and never become an assumed transaction price.

## Maintenance (Phase 21)

Authenticated vehicle owners can open `/vi/garage/:id/bao-duong` or `/en/garage/:id/maintenance` to record private service
history and user-defined upcoming plans. History stores Vietnam calendar dates, optional odometer and exact VND cost (unknown
is distinct from zero), with edit/archive/restore. Plans require a due date and/or odometer threshold and show due, due-soon,
not-due or unknown-mileage states. Completing a plan creates exactly one linked history record transactionally and never lowers
the vehicle odometer. Archived vehicles remain readable but block new or active maintenance operations. The feature has no
manufacturer intervals, public SEO pages, attachments, external notifications or new queue; active history is reserved as the
maintenance cost source for Phase 22.

## Vehicle Expenses (Phase 22)

Authenticated vehicle owners can open `/vi/garage/:id/chi-phi` or `/en/garage/:id/expenses` for a private monthly ledger.
Active Fuel Log and known Maintenance History costs are read dynamically as authoritative sources; no duplicate source
rows are created. Manual entries are limited to insurance, registration, toll, parking and other categories and use exact
integer VND strings (`0..9999999999999999`). Summaries preserve unknown maintenance costs and distinguish incomplete
known totals. Manual entries support detail/edit/archive/restore, while all private endpoints remain owner-scoped,
CSRF-protected and excluded from SSR data, storage, SEO and sitemaps. Budgets, recurring expenses, receipts/OCR,
refunds, currencies, budgets and notifications remain future scope.

## Driver Dashboard (Phase 23)

Authenticated owners can open `/vi/tong-quan` or `/en/dashboard` for a private, read-only overview. The page selects the
active primary vehicle by default with a deterministic active fallback, shows the active count and authoritative odometer,
document-expiry attention, maintenance due/due-soon/unknown-mileage counts, the selected vehicle’s Vietnam-month expense
and fuel summaries, monitoring capability/effective state and links back to Garage features. No account-wide financial
aggregate is exposed.

The dashboard API is `GET /api/v1/vehicles/dashboard` with validated `vehicleId` and `YYYY-MM` queries. Every read is
owner-scoped; foreign, missing or archived selections return the same safe 404. Cards reuse Phase 18–22 calculators and
expense semantics, are read independently, and carry one refresh timestamp. No schema, migration, provider, cache, queue,
write path or notification behavior is introduced. Private responses and routes remain no-store/no-referrer/noindex,
browser-fetched after auth, outside TransferState, storage, JSON-LD and sitemaps. Phase 24 is the notification center.
