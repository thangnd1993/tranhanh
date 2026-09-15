# TraNhanh Project Progress

## Current Status

Current completed phase: Phase 10 — Vehicle Plate Backend
Next phase: Phase 11 — Vehicle Plate Frontend + SEO
Status: Complete locally with live migration/import/database verification pending
Last updated: 2026-09-15 (Asia/Ho_Chi_Minh)
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

### Phase 3 — I18N Foundation

Status: Complete

- Architecture: typed semantic TypeScript dictionaries, one signal-based locale service, no new dependency.
- Supported locales: `vi`, `en`; default: `vi`. Vietnamese remains the primary product language.
- Routes: `/vi`, `/en`, `/vi/design-system`, `/en/design-system`; centralized equivalent-page mapping preserves query/hash.
- Root and legacy showcase paths redirect on the server to Vietnamese equivalents.
- Invalid locales redirect to `/vi`; unknown localized paths redirect to the same locale's home.
- Explicit language switches persist locally when storage is available; direct URLs always override that preference.
- SSR resolves locale before shell creation and sets `html.lang`, translated titles, and the existing description.
- Translated header, mobile menu, theme labels, footer, home, showcase, breadcrumbs, forms, feedback, and accessibility copy.
- Reusable common validation/state messages and Intl number, percentage, VND, date, time, and date/time helpers.
- Fixed presentation timezone: `Asia/Ho_Chi_Minh`; formatting does not perform business arithmetic.
- Language switcher: theme-compatible VI/EN buttons on desktop and full names in mobile navigation, keyboard accessible.
- Showcase remains `noindex, nofollow` in both language versions, including the SSR response header.

Validation:

- Angular tests: 10 passed, covering route redirects, translations, storage precedence, equivalent routes, and formatting.
- Existing API unit tests: 6 passed; API E2E: 1 passed.
- Formatting, ESLint, Prisma schema validation, shared types, API build, Angular browser/SSR build passed.
- Production SSR smoke: root/legacy/invalid-locale redirects, localized HTML and `lang`, 200 responses, showcase noindex.
- Headless QA: keyboard switching on desktop/mobile, persistence, direct-URL priority, history, control labels, and themes.
- No browser console or hydration errors observed. Sequential viewport checks passed for both pages and languages at
  320, 375, 390, 430, 768, 1024, 1280, and 1440px with no horizontal overflow.
- Visually reviewed Vietnamese mobile/light and English desktop/dark at 390px and 1440px.
- One browser/context/page reused; server and browser closed; temporary screenshots removed after review.
- Initial bundle: 298.91 kB raw / 82.27 kB estimated transfer, about 3.88 kB transfer above Phase 2.

Commit: `feat: add bilingual localization foundation` (this checkpoint).
Push destination: `origin/main`; resolve the pushed checkpoint with `git rev-parse origin/main` after synchronization.

Known limitations:

- Both small dictionaries are bundled eagerly for deterministic SSR/hydration; feature-level splitting is deferred.
- Unknown routes use redirects, not a dedicated 404 page. Full SEO, canonical/hreflang, and sitemap work remain Phase 4.
- Docker runtime verification remains pending from Phase 1 and does not block localization.

### Phase 4 — SEO Foundation

Status: Complete

- Central typed SeoPageConfig, route resolver declarations, and one SeoService own SSR/browser head output and cleanup.
- Localized route-specific titles/descriptions use existing dictionaries; brand/title-length helpers avoid blind truncation.
- Validated PUBLIC_SITE_URL and PUBLIC_ALLOW_INDEXING are passed through request context and hydration TransferState.
- No domain is assumed: default noindex, no fabricated canonical/alternates, and sitemap 503 until explicitly configured.
- Absolute canonicals use the correct locale path and omit query/hash; vi/en homepage alternates reuse the route mapping.
- Open Graph and Twitter summary metadata are localized; no invented social accounts or preview image URLs.
- Typed JSON-LD supports WebSite, Organization, WebPage and BreadcrumbList, with safe serialization.
- Homepage WebSite and showcase BreadcrumbList use factual content only; breadcrumb UI and JSON-LD share one model.
- Home index/follow is environment-gated; showcase noindex/nofollow; 404 noindex/follow; private defaults are noindex.
- Plain-text robots.txt and XML sitemap index/static segment list only real indexable localized homepages.
- One-hop 308 redirects normalize root, legacy showcase, trailing/duplicate slashes and locale casing, preserving queries.
- Arbitrary invalid paths now return localized HTTP 404 instead of redirecting to a successful homepage.
- Angular RESPONSE_INIT sets real 404 status and robots headers; 404 has no canonical or language alternates.
- Semantic review preserved navigation links/landmarks and corrected the showcase's extra sample H1.

Validation:

- Angular unit/component tests: 15 passed; existing API unit tests: 6 passed; API E2E: 1 passed.
- Formatting, ESLint, shared/API/browser/SSR production builds, and Prisma schema validation passed.
- HTTP tests cover localized metadata, canonicals, alternates, social locale, JSON-LD parsing, robots/sitemap,
  deliberate redirects and true 404 responses in configured and safe/unconfigured environments.
- XML parsed in unit tests; sitemap excludes showcase and nonexistent pages; script injection escaping verified.
- Headless checks passed for vi/en 404 at 390px and 1440px, keyboard home navigation, and metadata cleanup/hydration.
- Two representative screenshots reviewed and removed; browser/context/server processes closed after checks.
- Initial browser bundle approximately 305 kB raw / 84 kB estimated transfer; no new runtime SEO dependency.

Commit: `feat: add technical seo foundation` (this checkpoint).
Push destination: origin/main; verify synchronized checkpoint with `git rev-parse origin/main` after push.

Known limitations:

- Actual production domain/indexing activation remain deployment configuration; no live search-engine indexing claim.
- No social image, SearchAction, invented Organization details, or business sitemap segments are emitted.
- Docker verification remains pending from Phase 1 and was not performed in this phase.

### Phase 5 — Database Core

Status: Complete locally with runtime database migration verification pending

Core persistence:

- Models: DataSource, DataSourceTranslation, DataProvider, SyncRun, SourceReference, SeoPage, SeoMetadata.
- One readable Prisma schema; UUID v4 IDs stored as PostgreSQL UUID, immutable lowercase kebab-case internal keys.
- All instants use TIMESTAMPTZ(3); createdAt/updatedAt on mutable durable rows; presentation handles local timezone.
- Evidence uses [effectiveFrom, effectiveTo), exclusive end, null end ongoing; database CHECK prevents invalid intervals.
- DataSource is the publisher; DataProvider is a distinct adapter with a source FK and ACTIVE/DEGRADED/DISABLED status.
- Sources start inactive/non-official; adapters start disabled. No provider is approved or integrated by this phase.
- SyncRun records RUNNING/SUCCEEDED/FAILED, measured nullable counts, safe bounded errors and lifecycle timestamps.
- No PARTIAL, queues, business importers, raw payload storage, or generic metadata JSON added.
- SourceReference supports shared publication evidence with future explicit domain FKs, not polymorphic entity IDs.
- Source translations are unique per source+vi/en locale. UI dictionaries remain application code.
- SeoPage provides stable identity; SeoMetadata provides optional overrides, real page FK, locale and canonical path.
- SEO uniqueness covers page+locale and canonical paths; normalized paths must match locale. No current frontend reads
  or sitemap changes, and production origin/indexing still default safely.
- VND convention: exact BIGINT; fractional rates: exact Decimal/basis points. API BigInt serializes to decimal strings.
- Shared IntegerString, PageResult, and CursorResult describe wire contracts; future endpoints require explicit filters.
- Global safe Prisma error mapping covers identity/relation conflicts, missing records, unavailable database, and fallback.
- Singleton Prisma client stays lazy, honors schema configuration, and disconnects through enabled shutdown hooks.
- Prisma CLI/API now resolve the root .env consistently; Node built-in loading removes the undeclared dotenv dependency.
- Seed framework is an intentional no-op; test-only fixtures are transactionally rolled back in a guarded isolated suite.
- Documentation records transactions, idempotent keys/upserts/fingerprints, evidence retention and raw-data restrictions.

Migration and constraints:

- Migration: `20260911000000_add_core_data_foundation`.
- Generated from the empty Phase 1 schema with Prisma 7.10 and reviewed manually; seven tables and three enums.
- Six unique indexes, five query indexes, five explicit RESTRICT foreign keys; no cascading history deletion.
- Seven SQL CHECK constraints cover key syntax, nonnegative counts, sync completion, effective dates and canonical paths.
- Atomic BEGIN/COMMIT; no DROP/TRUNCATE, destructive updates, business inserts, or database reset.
- SQL-only CHECK rules are documented for preservation in later migrations. UUID/updatedAt remain Prisma-managed.
- Migration SQL generated/reviewed, but NOT applied to live PostgreSQL in this phase.

Validation:

- Dependency consistency: frozen lockfile, offline install, ignored lifecycle scripts and strict peer checks passed;
  no dependency or lockfile change was needed.
- Prettier, ESLint, full API TypeScript check (including tests/config), shared types and production builds passed.
- API unit tests: 29 passed across 5 files, including exact BigInt, safe errors, URL validation and database-runner guards.
- API E2E: 4 passed across 2 files, including actual HTTP BigInt/error-filter behavior and existing liveness regression.
- Angular regression: 15 passed across 5 files. Shared test command passed with no test files; shared type build passed.
- API, browser and SSR builds passed. Production HTTP i18n and both configured/safe SEO smoke suites passed.
- Built API liveness returned 200 with intentionally unavailable dependency addresses; SIGTERM shutdown completed.
- Prisma format, validate and generate passed; generated client remains ignored. No-op seed command passed.
- Docker Compose static configuration passed. PostgreSQL 18 volume mount corrected to /var/lib/postgresql;
  no existing volume was deleted, moved, or migrated.
- Sixteen real PostgreSQL integration cases are implemented but NOT executed: explicit local tranhanh_test required,
  migration deployment before tests, fixture rollback, no production/unknown database reset or drop.
- Zero browser windows and zero screenshots; test-owned HTTP/API processes were closed after validation.

Runtime state and limitations:

- Docker remains unavailable: daemon socket /Users/nhuphan/.docker/run/docker.sock does not exist.
- PostgreSQL migration execution, live constraints/connectivity and successful readiness remain pending.
- Redis live connectivity remains pending from Phase 1; no Redis functionality was expanded.
- Non-database tests do not replace actual PostgreSQL constraint verification. Runtime pending is explicitly retained.
- Public production origin/indexing remains unconfigured as before. No business domain or Phase 6 work started.

Commit: `feat: add core data foundation` (this checkpoint).
Push destination: origin/main; verify the pushed checkpoint with `git rev-parse origin/main` after synchronization.
Next phase: Phase 6 — Phone Prefix Lookup Backend

### Phase 6 — Phone Prefix Lookup Backend

Status: Complete locally with live migration/import/database verification pending

Dataset and evidence:

- Reviewed structured file: apps/api/data/phone-prefixes.json; 36 current prefix families and 21 legacy conversions.
- Operators: Viettel (12 current), VinaPhone (8), MobiFone (8), Vietnamobile (4), Gmobile (2), iTel (1), Wintel (1).
- Eight source publications reviewed on 2026-09-11, with UUID evidence, URLs, titles and actual retrieval instants.
- Current allocations use official operator sites; conversions use a ministry-hosted Vietnam+ report. Full source
  registry, exclusions, copyright/reuse notes and maintenance instructions are in docs/data-sources.md.
- No editorial articles, images, SIM listings, subscriber facts or full downloaded pages are committed.
- Exact effective instants are left null where a staged schedule/parallel dialing does not establish one whole-prefix cutover.
- This is a reviewed allocation subset, not an exhaustive numbering registry, serving-network or subscriber lookup.
- No live import has been run and no real SyncRun success is claimed while PostgreSQL remains unavailable.

Backend and schema:

- Added TelecomOperator, PhonePrefix and PhonePrefixMigration; added nullable document title to SourceReference.
- String prefixes preserve leading zero and separate current three-digit from legacy four-digit formats.
- UUID IDs, UTC TIMESTAMPTZ, nullable half-open effective intervals and RESTRICT history/evidence relations follow Phase 5.
- Migration: 20260911010000_add_phone_prefix_lookup; Phase 5 migration unchanged.
- Additive SQL: three tables, one enum, nullable title, three unique indexes, six query indexes, six FKs and four CHECKs.
- Reviewed BEGIN/COMMIT migration with no destructive SQL or dataset inserts; actual migration execution remains pending.
- Thin PhonePrefixesController and Prisma-backed service; no factual JSON fallback or hardcoded service dataset.
- GET /api/v1/phone-prefixes and /search: q, prefix, operator, status, bounded page/pageSize, prefix ASC ordering.
- GET /api/v1/phone-prefixes/:prefix: exact lookup, including legacy/current context, source and distinct timestamps.
- GET /api/v1/phone-prefixes/lookup?value=...: domestic, +84, 0084 and 84 forms, spaces/hyphens, current and legacy lengths.
- GET /api/v1/phone-prefixes/:prefix/related: up to 12 active related prefixes for the allocated operator.
- Invalid/unsupported input returns 400; unknown numeric prefix 404; existing safe database error policy retained.
- Shared request/response, evidence and migration contracts; no frontend dependency on generated Prisma types.
- Swagger includes route purpose, validation, nested responses, factual prefix examples and error responses.
- Canonical operator brands stay untranslated; reusable accent/case search normalization only changes search keys.
- Response operatorResolution=PREFIX_ALLOCATION and currentSubscriberNetworkVerified=false avoid incorrect portability claims.

Import and privacy:

- Workspace commands phone-prefixes:validate and phone-prefixes:import build and run a reviewed-file CLI.
- Validation checks structure, unique identities, URLs, dates, relations, status lengths and complete same-operator mappings.
- Transactional upserts with an advisory lock, immutable evidence snapshots and unchanged-record timestamp preservation.
- Silent operator reassignment and historical replacement changes are refused; omitted rows are never automatically deleted.
- Actual runs use generic SyncRun audits and a clearly non-official TraNhanh maintainer provider; factual attribution
  remains linked to the external source evidence. Failed domain transactions do not leave partial imported records.
- Full user numbers are reduced to a prefix before DB queries and never persisted, echoed or logged by new application code.
- Lookup responses are no-store/no-referrer; proxy/APM query logging and browser history need deployment privacy controls.
- No subscriber identification, number-portability query, external lookup requests, Redis cache or queue was added.

Validation:

- Dependency consistency (frozen/offline lockfile and strict peer checks), Prettier, ESLint and full API TypeScript passed.
- API unit tests: 81 passed across 8 files, including normalizer, authoritative dataset assertions, importer decisions
  and service privacy/history guards. No database constraint success is inferred from these tests.
- API E2E: 13 passed across 3 files. Phase 6 uses a clearly synthetic in-memory Prisma fixture; real controller,
  DTO/service, source mapping, pagination/search, legacy/related results, errors and Swagger paths are exercised.
- Angular regression: 15 passed across 5 files. Shared command passed with no test files; shared type build passed.
- Shared, API, browser and SSR production builds passed; production HTTP i18n and configured/safe SEO checks passed.
- Prisma format/validate/generate passed. Both the workspace validator command and built CLI validated 57 prefix rows.
- Phase 6 SQL reviewed; Compose static configuration passed. Generated client, .env and temporary research files untracked.
- Added 13 PostgreSQL cases for repeat imports, rollback on conflict, joined evidence, uniqueness, FK/delete and CHECK rules.
  These 13 plus the 16 Phase 5 PostgreSQL cases (29 total) remain NOT executed while Docker is unavailable.
- Zero visible browsers and zero screenshots; HTTP smoke-test processes close after validation.

Runtime and remaining limits:

- Docker daemon socket remains absent at /Users/nhuphan/.docker/run/docker.sock.
- Phase 5/6 migrations, actual phone-prefix import, 29 PostgreSQL cases, Redis connectivity and successful readiness
  remain pending. No reset/drop or unknown production database operation was performed.
- Prefix families cannot prove subscriber existence/current network; unreviewed operators/suballocations are not inferred.
- No phone-prefix frontend, SEO routes, sitemap additions, area-code model or unified search was started.

Commit: `feat: add phone prefix lookup backend` (this checkpoint).
Push destination: origin/main; verify the synchronized checkpoint with `git rev-parse origin/main` after push.
Next phase: Phase 7 — Phone Prefix Frontend + SEO

### Phase 7 — Phone Prefix Frontend + SEO

Status: Complete locally; live PostgreSQL-backed integration remains pending.

- Implemented `/vi/tra-cuu/dau-so`, `/vi/tra-cuu/dau-so/:prefix`, `/en/lookup/phone-prefix`,
  `/en/lookup/phone-prefix/:prefix`; no Phase 8 work or homepage redesign.
- API-driven index groups verified current prefixes by operator, filters locally, and links legacy mappings.
  Reusable result cards provide answer, status, source, distinct dates, related prefixes and historical navigation.
- Search uses the existing backend normalizer; clears input and navigates only to a prefix. No subscriber search storage,
  full-number URLs or metadata. Malformed/unknown/unavailable search feedback is localized and accessible.
- Current wording: “Đầu số 086 được phân bổ cho Viettel.” MNP note distinguishes allocation from current serving network.
  Legacy 0168 links to 038; missing migration dates remain explicitly unknown. Vietnamese and English copy reviewed.
- SSR resolver consumes real API; server-only API_ORIGIN and same-origin browser gateway support separate deployment.
  TransferState avoids duplicate detail/related hydration requests. Production contains no fixture fallback.
- Localized titles/descriptions, OG, canonical, equivalent hreflang, WebPage and matching breadcrumb JSON-LD implemented.
  Unknown/invalid routes are 404/noindex; unavailable, malformed or empty data is 503/noindex; errors have no canonical.
  Query variants are noindex. Nonexistent conceptual Lookup breadcrumb is not linked.
- API-driven phone sitemap segment includes 116 URLs for the reviewed 57-prefix fixture; no search/unknown/showcase URLs.
  Empty/unavailable catalogues do not advertise a phone sitemap segment.

Validation:

- Prettier and ESLint passed. Angular: 25 tests across 6 files. API regression: 81 unit and 13 E2E tests passed.
  Shared test command passed with no test files; shared type build passed.
- Prisma validate/generate passed; dataset validator confirmed 7 operators, 57 prefixes and 21 legacy mappings.
- API, Angular browser and SSR production builds passed. Existing i18n and both configured/safe SEO smoke tests passed.
- Raw HTML verified vi/en current and legacy answers, titles, descriptions, language, canonical/hreflang, robots,
  source and breadcrumb/WebPage JSON-LD. 404 and 503 states and sitemap inclusion/exclusion passed.
- One headless browser, one context/page reused: six routes at 320/375/390/430/768/1024/1280/1440 passed overflow,
  single-H1 and chip target checks. Search normalization/privacy, hydration request counts and mobile language switching passed.
- Representative 390/1440 light/dark screenshots inspected: readable evidence, wrapped links, restrained MNP note,
  primary answer above the fold, no overflow. Temporary screenshots removed; test-owned browser/server processes closed.
- Final browser bundle approximately 316.8 kB raw / 87.6 kB transfer; feature component lazy-loaded.

Runtime limits:

- Docker checked again; daemon socket still absent. Actual migrations, import, 29 PostgreSQL cases, Redis readiness,
  and live DB-backed API/SSR verification remain pending. Test adapters do not close this runtime gap.
- Public production origin is not configured; indexing remains safely disabled until explicit deployment configuration.
- Reverse-proxy/APM lookup query logging must stay disabled. Related-link failures hide that supplementary section only.

Commit: `feat: add phone prefix lookup frontend` (this checkpoint).
Push destination: origin/main; resolve the final synchronized hash with `git rev-parse origin/main`.
Next phase: Phase 8 — Area Code Backend

### Phase 8 — Area Code Backend

Status: Complete locally; PostgreSQL migration/import/constraint verification pending.

- Reviewed ministry/Cục Viễn thông 2025 publication and attached annex, the ministry's 2036/QĐ-BTTTT registry,
  and VNPT Hà Nội's historical conversion tables. Detailed provenance/reuse limits are in `docs/data-sources.md`.
- Dataset: 63 ACTIVE codes, 59 LEGACY codes and 59 mappings, 63 telecom service areas and 34 reviewed groups.
  2025 temporary parallel codes remain ACTIVE; proposed consolidation is not treated as an effective migration.
- Source-era names stay separate from contemporary telecom grouping. No administrative hierarchy or canonical
  administrative IDs are invented; future phases can add dated administrative links without replacing telecom IDs.
- Added AreaCode, AreaCodeMigration, TelecomLocality and TelecomLocalityGroup, with sourced relations and calendar dates.
  Transition-start dates are not switch-off instants; unknown dates remain null.
- New additive migration `20260911020000_add_area_code_lookup`: four tables, one enum, four unique indexes,
  eight query indexes, eight RESTRICT foreign keys and five CHECKs. Prior migrations verified unchanged.
- Implemented list/search/lookup/exact/related routes under `/api/v1/area-codes`, shared contracts and Swagger.
  Search supports accents, reviewed aliases and grouped service areas; filters and pagination are bounded.
- Normalization supports 0236/236/+84236/0084236/84 236/0236-. Full current fixed-line inputs use actual known codes
  and longest matching. Legacy full numbers are deliberately unsupported; code-only historical lookup retains context.
- Input errors are 400, known-format unknowns 404, infrastructure errors sanitized. No subscriber identity, persistence,
  query logging, caching or full-number echo. Full numeric searches are rejected outside the dedicated lookup endpoint.
- Validator and separate import commands implemented. Import is transactional/idempotent, preserves omitted history,
  refuses assignment/group/history overwrites and retains immutable source snapshots plus safe sync audit outcomes.

Validation:

- Prettier, ESLint and complete API TypeScript checks passed; shared test command/type build passed.
- API: 118 unit tests across 10 files; 23 E2E tests across 4 files passed. New coverage includes source accuracy,
  grouping semantics, normalization, privacy, errors, searches, related codes, import decisions and Swagger.
- Angular regression: 25 tests passed. API, shared, browser and SSR production builds passed.
- Existing i18n/SEO and Phase 7 phone SSR/sitemap smoke regressions passed using the explicit test adapter.
- Prisma format/validate/generate and area/phone dataset validators passed. SQL reviewed; Compose static config passed.
- Eighteen new PostgreSQL tests prepared for import idempotency, joined relations, uniqueness, FKs, RESTRICT,
  SQL CHECKs and rollback. These plus the earlier 29 cases (47 total) have NOT run against PostgreSQL.
- Backend-only validation: no browser visual audit, no visible browser windows or UI screenshots. No source downloads
  or temporary data dumps included in the commit. No Angular/phone source, area SEO routes or sitemap additions.

Runtime and limits:

- Docker checked at initial work and continuation; daemon socket still absent. Migrations, actual imports, 47 database
  cases, Redis connectivity, successful readiness and live DB-backed frontend verification remain pending.
- Data was reviewed on 2026-09-11, not continuously synchronized. Source-era spelling is intentional. Later telecom
  regrouping needs reviewed history work; current group keys are not permanent administrative-unit identifiers.
- Production domain/indexing configuration remains unset and safely disabled. Phase 9 was not started.

Commit: `feat: add area code lookup backend` (this checkpoint).
Push destination: origin/main; resolve the final synchronized hash with `git rev-parse origin/main`.
Next phase: Phase 10 — Vehicle Plate Backend

### Phase 9 — Area Code Frontend + SEO

Status: Complete locally; live PostgreSQL-backed verification pending.

- Added bilingual index/detail routes: /vi/tra-cuu/ma-vung[/:code] and /en/lookup/area-code[/:code].
- Current pages provide an immediate sourced locality answer. Verified legacy pages retain their own URL, historical
  context, replacement link and supported migration date; /0511 does not redirect to /0236.
- The index groups 63 current codes by reviewed telecom-locality group and lists 59 legacy mappings separately.
  Telecom labels remain source-backed and include a concise administrative-name context note.
- Search delegates numeric/full-number normalization and locality aliases to the backend. Multiple locality matches are
  shown as a short result list. Full numbers are cleared and never enter canonical URLs, metadata, HTML or storage.
- Added typed API boundary validation, SSR transfer state, visible source provenance and localized 404/503 states.
- Added localized title/description, canonical, paired hreflang, WebPage/BreadcrumbList and sitemap-area-code.xml with
  246 verified URLs. Existing Phone Prefix sitemap remains at 116 URLs.
- UI uses existing tokens and is answer-first, responsive and accessible in light/dark themes.

Validation:

- Prettier, ESLint and TypeScript passed. Angular: 36 tests across 7 files passed.
- API regression: 118 unit and 23 E2E tests passed. Shared test command passed.
- API and Angular browser/SSR production builds passed; Prisma validate/generate and Area Code validator passed.
- I18N/SEO, Phone Prefix and Area Code SSR/sitemap smoke tests passed.
- One headless Chrome process covered 6 routes at 8 widths (320–1440), SSR hydration, locality search, full-number privacy,
  and light/dark. Four representative 390/1440 screenshots were visually reviewed; temporary images were not committed.

Runtime and limits:

- Docker daemon remains unavailable. The 47 prepared PostgreSQL tests, migrations/imports, Redis connectivity, readiness
  and live DB-backed SSR remain pending. Production origin/indexing configuration remains unset and safely disabled.
- No vehicle-plate, administrative-domain or global-search work was started.

Commit: feat: add area code lookup frontend (this checkpoint).
Push destination: origin/main; resolve the synchronized hash after push.
Next phase: Phase 10 — Vehicle Plate Backend

### Phase 10 — Vehicle Plate Backend

Status: Complete locally; PostgreSQL migration/import/constraint verification pending.

- Reviewed the current Bộ Công an allocation under Thông tư 51/2025/TT-BCA, the preceding Thông tư 79/2024
  allocation table, and the official 2025 series explanation. Provenance and reuse limits are in `docs/data-sources.md`.
- Dataset: 81 active numeric prefixes for 34 current localities plus Cục CSGT; 64 total retained allocation targets;
  29 source-backed former-target transitions ending 2025-07-01. Existing issued plates are not marked invalid.
- Added VehiclePlateTarget, VehiclePlateAllocation, and VehiclePlateAllocationHistory with separate prior/transition
  evidence, source-era names, target type, calendar dates, immutable references, and explicit import clocks.
- Added additive migration `20260915030000_add_vehicle_plate_lookup` with two enums, three tables, scope uniqueness,
  query indexes, seven RESTRICT foreign keys, and format/date CHECKs. Prior migration files remain unchanged.
- Added list/search/lookup/exact/related endpoints under `/api/v1/vehicle-plates`, shared contracts, validation DTOs,
  nested history/source results, deterministic pagination, safe errors, and Swagger coverage.
- Normalization supports 51, 51K/51k, 30K, 51K-123.45 and 51K 12345. Full serials are discarded before Prisma.
  Series is parsed but not used to infer narrower locality without evidence; current responses report it unverified.
- Numeric/series ambiguity returns every sourced match with `ambiguous=true`; no arbitrary target is selected.
- No full plate, registration serial, vehicle, owner, search history, query audit, cache, or external lookup was added.
  Responses explicitly state numeric-prefix allocation and no vehicle/owner verification.
- Versioned validator and transactional/idempotent import commands preserve omitted history, immutable evidence and
  unchanged timestamps, while refusing silent target renames, allocation reassignment, or identity overwrite.

Validation:

- Dataset command validated 64 targets, 81 current prefixes, and 29 historical target mappings.
- API unit tests: 142 passed across 12 files. API E2E: 29 passed across 5 files.
- Full workspace gate passed: Prettier, ESLint, 142 API unit tests, 36 Angular tests, 29 API E2E tests,
  shared/API/browser/SSR production builds, and Prisma validation. Dataset validation passed separately.
- Five new guarded PostgreSQL cases are prepared, bringing the pending total from 47 to 52. They are not claimed run.
- Backend-only phase: no browser, frontend route, sitemap, screenshot, UI source, or Phase 11 work was added.

Runtime and limits:

- Docker daemon remains unavailable. Migration execution, reviewed data import, 52 PostgreSQL cases, Redis readiness,
  and live DB-backed API verification remain pending. No unknown database was modified.
- The dataset was reviewed 2026-09-15 and is not continuously synchronized. Future legal changes require a new review.
- Current allocation sources are numeric-prefix based. The API does not infer district, vehicle category, registration
  status, present vehicle location, owner identity, or validity from a submitted plate.

Commit: `feat: add vehicle plate lookup backend` (this checkpoint).
Push destination: origin/main; resolve the synchronized hash after push.
Next phase: Phase 11 — Vehicle Plate Frontend + SEO

## Current Architecture Decisions

- Use the pnpm workspace and Node 24.15.x baseline created in Phase 1.
- Use Angular server output with prerendering for static routes and SSR for future dynamic routes.
- Keep infrastructure clients lazy so liveness works when dependencies are unavailable.
- Require sourced facts, versioned data, safe money arithmetic, bilingual UI, and SEO from inception.

## Active Data Providers

Phone-prefix, area-code, and vehicle-plate reviewed-file importers implemented; official evidence registries reviewed. No live database import or
external runtime provider is active yet. See `docs/data-sources.md` for sources and limitations.

## Environment Notes

- macOS workspace: `/Users/thangnguyen/Documents/ChatGPT/tranhanh`.
- Required Node: 24.15.x; pnpm: 12.3.x.
- Docker CLI is installed; daemon unavailable at `/Users/thangnguyen/.docker/run/docker.sock`.
- Git identity is configured. Branch: `main`; GitHub SSH remote is configured (see GitHub Connection).
- No credentials, provider accounts, or deployment destination were supplied.

## Pending Work

### Next Phase

Next phase: Phase 11 — Vehicle Plate Frontend + SEO

The master specification defines this order:

1. Phase 3 — I18N Foundation (complete)
2. Phase 4 — SEO Foundation (complete)
3. Phase 5 — Database Core (complete locally; runtime migration verification pending)
4. Phase 6 — Phone Prefix Lookup Backend (complete locally; runtime migration/import verification pending)
5. Phase 7 — Phone Prefix Frontend + SEO (complete locally; live DB-backed verification pending)
6. Phase 8 — Area Code Backend (complete locally; live DB-backed verification pending)
7. Phase 9 — Area Code Frontend + SEO (complete locally; live DB-backed verification pending)
8. Phase 10 — Vehicle Plate Backend (complete locally; live DB-backed verification pending)
9. Phase 11 — Vehicle Plate Frontend + SEO

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
