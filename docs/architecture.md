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
application builder in server output mode. Localized pages use request-time SSR through the Express entry.
The root redirects to `/vi`; the two localized showcase routes are excluded from indexing.
The application uses explicit zoneless change detection.

The web design system is split into global SCSS modules for semantic tokens, themes, base rules, utilities, and
controls. Components consume semantic custom properties instead of raw palette values. Light and dark themes are
separate token assignments; the system preference follows `prefers-color-scheme`. A small prepaint script reads
the persisted preference before the main bundle to avoid a theme flash, and the Angular theme service keeps that
state synchronized after bootstrap.

Standalone primitives under `apps/web/src/app/design-system` provide buttons, fields, cards, feedback states,
breadcrumbs, and a controlled inline SVG icon set. Shared header and footer components live under
`apps/web/src/app/layout`. The lazy `/:locale/design-system` routes are the visual contract for these primitives and contain
only clearly labeled illustrative values.

## API

NestJS runs as an ESM application under the /api/v1 prefix. Swagger is exposed at /api/docs. Global DTO
validation rejects non-whitelisted input. CORS accepts the configured web origin.

GET /api/v1/health is a process liveness probe and never depends on infrastructure. GET /api/v1/health/ready
checks PostgreSQL and Redis, returning HTTP 503 and a safe per-dependency status if either is unavailable.

## Configuration and infrastructure

Nest configuration validates environment variables through Joi at startup. Development defaults mirror
.env.example; deployment values remain environment-controlled. Prisma uses PostgreSQL through the official
pg driver adapter and creates connections lazily. Phase 5 adds the core schema and first reviewed migration.

Redis uses a lazy client for readiness and future cache access. BullMQ is configured globally with the same
Redis connection, but no queues or jobs are registered until provider phases require them.

Development services use persistent named volumes and health checks in compose.yaml. Runtime container,
database, Redis, and migration-connectivity verification remains pending while the Docker daemon is unavailable.

## Data and money rules

Providers must validate and normalize data before storage. Public requests must not call external providers on
every visit. Use integer-safe or decimal arithmetic for money, effective dates for tariffs and administrative
mappings, and safe API serialization. Never generate factual values using AI.

## Localization (Phase 3)

The route is the authoritative locale source: Vietnamese (`vi`, default) and English (`en`). A route guard resolves
locale before creating the shared shell, for both SSR and browser navigation. `LocaleService` owns readonly locale
state and typed translation access. `vi.ts` defines semantic translation keys; `en.ts` must satisfy the same key set.
Both small dictionaries ship synchronously to avoid language flash, translation requests, and hydration races.
No additional localization dependency is required; the initial estimated transfer grew from 78.39 kB to 82.27 kB.
Split dictionaries by feature only when growth justifies the loading complexity.

Registered page identities map through `i18n/routes.ts`: `/vi` and `/en` for home, and `/vi/design-system` and
`/en/design-system` for the showcase. Language switching preserves the registered page, query parameters, and fragment.
Native buttons expose the selected language with `aria-pressed`, with full language names in mobile navigation.
Successful explicit switches persist `tranhanh.locale` when storage is available. Stored preference never overrides
a direct URL or influences SSR. Browser Back/Forward resolves the locale again from its route.

Angular SSR returns an HTTP redirect for `/` to `/vi`, and `/design-system` to `/vi/design-system`.
Phase 4 replaces the previous unknown-path redirects with localized HTTP 404 responses. The two deliberate legacy
redirects remain; neither legacy path renders duplicate indexable content.
The showcase retains `noindex, nofollow` in the SSR response header and HTML for both locales.

The locale guard updates the request-scoped document's `html.lang` before rendering. Phase 4 SEO resolvers now own
titles, descriptions, and all other head metadata centrally. The browser runs the same resolution before hydration;
there is no server dependency on local storage or unsafe global document/window access.

Tree-shakeable `Intl` presentation helpers provide numbers, ratio percentages, VND, dates, times, and date/time.
They use `vi-VN` or `en-US` and an explicit default timezone of `Asia/Ho_Chi_Minh` to avoid server/browser drift.
Callers supply a Date or epoch instant and may override timezone. Formatting is not business arithmetic or a monetary
rounding policy. Common translation keys cover required/invalid validation and loading, empty, stale, error/retry states.

After a production build, `pnpm test:ssr` starts a temporary SSR server and checks redirects and initial localized HTML.
Set `PLAYWRIGHT_MODULE` to an installed Playwright module and optionally `CHROME_EXECUTABLE` to enable the same script's
headless browser checks. It reuses one browser/context/page and checks viewports sequentially, then closes all resources.
Optional `I18N_SCREENSHOTS=1` writes two temporary representative images for review; delete their reported directory
after inspection. Routine screenshots are not version-controlled.

## Technical SEO (Phase 4)

`seo/SeoPageConfig` is the typed interface for resolved localized titles/descriptions, canonical paths, robots,
alternates, Open Graph overrides, structured data, and breadcrumbs. Route resolvers declare the page model and call
`SeoService.apply`; future data-dependent resolvers can use the same API with validated entity content.
Only the SEO service manages Title/Meta, link tags, JSON-LD, and SSR response status/robots headers. It replaces owned
head nodes on every navigation to avoid stale canonical, alternate, social, or schema tags. `active()` provides readonly
configuration inspection for tests/tools; there is no visible debug panel or noisy logging.

`seo/page-registry.ts` declares current page policies and reuses Phase 3 paths. Home is `index, follow` only when
indexing is explicitly enabled; showcase is always `noindex, nofollow`; 404 is `noindex, follow`. Unspecified future
page policy defaults to private/noindex. The environment can disable indexing but cannot override page-level noindex.
Metadata uses existing vi/en dictionaries and accurate descriptions of the product under development. The title helper
adds the brand only when absent and exposes a length-review helper instead of destructively truncating titles.

### Public origin and deployment

The Express SSR entry validates `PUBLIC_SITE_URL` and `PUBLIC_ALLOW_INDEXING` at startup. The former must be an origin
without credentials, path, query, or fragment. Indexing requires a public HTTPS origin; production also rejects local
or HTTP origins even when indexing is disabled. No production domain has been supplied in this repository.
Unset origin defaults to null and indexing defaults to false: no absolute canonical, alternates, URL schemas, or sitemap
are fabricated. Sitemap endpoints return 503 with noindex until origin and indexing are configured. Invalid configuration
fails startup clearly. Set both variables explicitly for a public deployment; staging should keep indexing false.

The validated, non-secret public config travels through Angular REQUEST_CONTEXT and TransferState, so server and
hydrated browser use the same origin/indexing policy. Never derive canonical host from request Host headers.
The server reads its process environment; a local `.env` file must be explicitly loaded (for example Node's `--env-file`)
or exported by the launch environment. No SEO secrets or provider credentials are involved.

### Canonical, alternates, and social output

Canonicals are absolute and use the configured origin plus the registered locale path. Tracking/query parameters and
fragments are excluded from canonical generation while application URL state is preserved. Homepage alternates link
only the real vi/en equivalents; no x-default is added because `/` already redirects to Vietnamese. The showcase is not
advertised as a language SEO landing page. 404s omit canonical and alternates entirely.

Open Graph title, description, type, URL when available, and locale match the page; indexable translated pages include
alternate locale metadata. Twitter summary metadata has no invented handles or images. The typed image API accepts an
actual HTTPS image and alt text; no current image is declared. Titles/descriptions are set through text/attribute APIs.

### Structured data and breadcrumbs

The homepage emits a minimal truthful WebSite schema at its localized URL when origin is configured. No SearchAction,
ratings, reviews, company address, contacts, or social identities are invented. Typed definitions also support minimal
Organization and WebPage for future factual use. JSON-LD serialization escapes HTML-sensitive characters and Unicode
line separators before writing script text, preventing script termination/injection.
The same `SeoBreadcrumb` model drives the visual breadcrumb and derived BreadcrumbList; showcase is the current example.
Future features should supply that model once in their SEO config, then bind the component to `active().breadcrumbs`.

### HTTP endpoints, redirects, and 404

`/robots.txt` is plain text: public mode allows content/assets and excludes `/api/`; disabled mode disallows crawling.
Public showcase URLs are crawlable so crawlers can observe their noindex directive. Robots rules are not authentication.
`/sitemap.xml` is a sitemap index referencing the one populated `/sitemap-static.xml` segment. The segment deterministically
contains only `/en` and `/vi` from the indexable page registry; no fake future domains or business pages are listed.
Both endpoints return application/xml in enabled mode. The segment list can expand when real feature URLs exist.

The server issues 308 redirects in one hop for root/legacy showcase, trailing slash removal, duplicate slash collapse,
and vi/en locale casing. It preserves query state and never converts arbitrary unknown paths into the homepage.
Unknown routes use the known locale for 404 copy, or Vietnamese for an unsupported locale. The resolver sets Angular's
RESPONSE_INIT status to 404 and noindex headers; SSR tests verify the actual HTTP status, not only a styled error screen.
The new page reuses existing landmarks, buttons, typography, spacing, and keyboard navigation. The showcase type sample
uses a styled paragraph so each current page has one logical H1.

### Validation and references

After building, `pnpm test:seo` runs sequential HTTP checks in configured and safe/unconfigured environments. It validates
initial SSR metadata, correct 404/redirect statuses, sitemap and robots responses, and JSON-LD parsing. Unit tests parse
sitemap XML with DOMParser, verify config validation and script-safe serialization, and test head cleanup across routes.
Optional PLAYWRIGHT_MODULE/CHROME_EXECUTABLE enable one reused headless page for 404 responsive and keyboard checks.
SEO_SCREENSHOTS=1 writes two temporary 404 screenshots; remove the reported directory after review.

Framework and crawler behavior were checked against [Angular SSR](https://angular.dev/best-practices/performance/ssr)
and [Google robots metadata guidance](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag).

## Database core (Phase 5)

### Identity, time, and exact numbers

All seven core models use Prisma-generated UUID v4 primary keys stored as PostgreSQL UUID. UUIDs and stable
lowercase kebab-case keys are immutable identities; migration CHECK constraints enforce source/provider/page key
syntax. Provider external IDs belong to later domain tables with provider-scoped unique constraints. Official display
names are not unique identifiers. Localized display text is separate from source identity; SEO slugs are normalized
lowercase ASCII kebab-case route components and never database primary keys. A changed slug needs an explicit redirect.
Prisma supplies UUID defaults and updatedAt; future raw SQL writers must supply those values explicitly.

Every stored instant uses TIMESTAMPTZ(3), interpreted in UTC and localized at presentation. Mutable durable rows use
createdAt and updatedAt. Evidence alone has optional effective dates: [effectiveFrom, effectiveTo), inclusive start,
exclusive end; null end means ongoing, both null means unspecified. A known end requires a start and must follow it.
Future domain history uses the same half-open convention, selecting current rows where start <= now and end is null
or now < end. Preserve superseded facts as historical rows and enforce non-overlap per domain identity when required.

Future VND columns use BIGINT with integer-safe arithmetic. Fractional rates use explicit-precision Decimal or integer
basis points; never PostgreSQL float/double or JS number for arbitrary monetary values. Express's JSON replacer converts
native BigInt recursively into base-10 strings, including negatives and zero, without a global prototype patch. Shared
IntegerString documents the wire contract. Future DTO/OpenAPI schemas must declare string values, clients must parse
with BigInt/exact decimal as appropriate, and decimal rates should also cross JSON as explicit exact strings. Existing
Intl presentation helpers do not implement financial arithmetic or silently coerce arbitrary strings into numbers.

### Sources, adapters, and evidence

DataSource represents the publisher/origin with a stable key, official name, public URLs, and explicit active/official
flags defaulting to false. DataSourceTranslation stores only localized description/license notes, unique by source and
vi/en locale. No duplicate publisher rows per language. DataProvider identifies a specific adapter and references its
source. Its providerType is a stable adapter-kind string, not a credentials/configuration blob; status is ACTIVE,
DEGRADED, or DISABLED (default). Future importers must check both source activation and provider status.

SourceReference represents a retrieved publication/evidence snapshot. Future domain rows use explicit sourceReferenceId
foreign keys (or a domain-specific join for multiple references). No arbitrary entityType/entityId relationships.
Multiple normalized facts from one publication can share evidence; repeated retrievals may create new references.
Do not impose URL uniqueness because the same URL can publish changed data. publishedAt is optional; retrievedAt is
required and must represent actual retrieval, not an invented date. Notes are short factual evidence notes, not a CMS.
Once referenced, prefer new evidence snapshots over rewriting historical attribution.

normalizeSourceUrl is the reusable application-boundary helper for future source/evidence writes: only HTTP(S), no
credentials, query strings, or fragments, and a 2048-character normalized limit. Query-based public sources will need an
explicit reviewed adapter policy before storing their URLs. The helper does not authorize network access: future
adapters also require host allowlists and redirect validation. There is no source write endpoint in this phase, so no
new write DTO bypasses validation. Secrets remain in environment/secret management, never in source/provider rows.

### Sync lifecycle, transactions, and idempotency

SyncRun records provider, jobType, RUNNING/SUCCEEDED/FAILED, timestamps, nullable nonnegative counts, and bounded safe
error code/message. RUNNING requires null finishedAt; terminal statuses require finishedAt >= startedAt (database CHECK).
PARTIAL is omitted: no partial-import semantics are defined. Counts are unknown when null; zero means measured zero.
No arbitrary JSON metadata, queue ID coupling, raw response, or payload fingerprint column is needed yet.

Future adapters fetch, validate, and normalize outside transactions. Create the RUNNING audit record, then use a bounded
Prisma transaction for normalized upserts, attribution links, successful counts/status, and the provider success instant.
If that transaction rolls back, record FAILED and the provider failure instant in a separate transaction using an
allowlisted safe code/message, never error.message from an external response. Terminal audit records are retained;
crash recovery must later reconcile stale RUNNING records explicitly. No queue, scheduler, or importer is implemented.

Idempotency belongs to each later domain's source/provider-scoped external ID or natural-key unique constraint and upsert.
If a provider lacks stable IDs, define a versioned SHA-256 fingerprint over validated, canonically ordered normalized fields
with explicit units and dates, excluding volatile retrieval times and secrets. Do not hash/store whole raw responses by
default. Network calls never run inside transactions; retries must be bounded and safe against already committed data.

Raw third-party payloads are not persisted in Phase 5. A future justified debug/evidence/reprocessing store must define
retention, size limits, secret/PII filtering, access control, and deletion before use. Normalized facts take priority.

### Localized SEO persistence

SeoPage is an explicit stable page identity with a unique key. SeoMetadata has a real page foreign key, vi/en locale,
unique page+locale, globally unique localized canonicalPath, and nullable title/description/noindex overrides. A migration
CHECK requires normalized locale-matching paths with no host, query, fragment, or trailing slash. Future domain models
may own an optional unique seoPageId FK; avoid polymorphic target strings. A page or override row is not required for
application-generated defaults. UI dictionaries remain TypeScript; there is no generic LocalizedContent/CMS table.

Future resolvers can combine an actual entity, its optional page/locale overrides, and a registered canonical route into
Phase 4 SeoPageConfig. Route declarations must agree with the stored path and validate editorial inputs. Database
noindexOverride=false must never bypass deployment/private-page restrictions. There is no current database SEO read,
admin editor, sitemap change, or modification to the existing safe noindex behavior.

### Constraints, indexes, and deletion

Unique constraints cover publisher/adapter/page keys, source+locale notes, page+locale metadata, and canonical paths.
No duplicate indexes are added for these lookups. DataProvider.sourceId supports publisher joins; status supports enabled
adapter selection. SyncRun(providerId, startedAt DESC, id) supports stable provider history ordering;
SyncRun(status, startedAt) supports stale-run inspection. SourceReference(sourceId, retrievedAt DESC) supports evidence
history. Existing compound unique indexes also cover their leading foreign-key columns. Review real query plans before
adding more indexes; there is no low-selectivity standalone source boolean index.

All five core foreign keys explicitly use RESTRICT for deletes and identity updates. Disable sources/providers rather
than erase history; removing a provider cannot cascade to sync runs. No blanket deletedAt fields. Later domains must use
the same audit-preserving policy for source references and page ownership. Administrative hard deletion and audit retention
policies are deferred, not implicitly provided by a generic delete API.

### Database integration and validation

The global DatabaseModule owns one typed PrismaService. Connections remain lazy for honest dependency-free liveness;
shutdown hooks disconnect the client and existing Redis client. The adapter honors DATABASE_URL's schema parameter.
Prisma config uses Node's built-in optional .env loading; both CLI and API resolve the repository-root .env independent of
working directory. Exported environment variables retain priority. No transitive dotenv import is required.
A global Prisma exception filter returns safe conflict, relation conflict, missing-record, unavailable, or generic error
responses; it excludes internal fields, SQL, credentials, and stacks. Readiness still probes PostgreSQL and Redis and
reports 503 on failure. No public sources/providers endpoints or meaningless repository wrapper are added.

Shared PageResult provides one-based offset pagination; CursorResult supports large histories with opaque stable cursors.
Future endpoints validate bounded page sizes and explicit filter/sort DTOs; never pass arbitrary client Prisma fields.

The seed command is deliberately a no-op: no approved foundation records are required. Test-only fixtures live in isolated
integration transactions and always roll back. The migration is additive and wrapped in a PostgreSQL transaction, with
reviewed CHECK constraints maintained in SQL because Prisma schema syntax cannot express them. Generate/validate does not
prove live constraints. The guarded integration runner requires an explicit local tranhanh_test database, applies migrations,
then verifies real uniqueness, relations, deletion, enums, intervals, timestamps, and canonical rules. Never reset an unknown
or production database. Local runtime verification on 2026-09-17 applied all nine migrations from an empty isolated `tranhanh_test`, passed 81 real PostgreSQL constraint tests, and confirmed truthful database/Redis readiness.

### Verified local runtime integration

The guarded `pnpm test:runtime` suite requires `NODE_ENV=test` and a loopback `DATABASE_URL` whose database is exactly
`tranhanh_test` with the public schema. It combines real PostgreSQL and Redis/BullMQ without calling CSGT: a deterministic
fake AUTOMATED provider covers monitoring runs, snapshots, meaningful changes, and retry recovery, while the production
CSGT adapter remains `MANUAL_ONLY` and creates no automated run or schedule. Document reminder jobs validate delayed
scheduling, deterministic IDs, dedupe, stale-expiry rejection, archive suppression, and restore reconciliation. Queue
payloads remain opaque IDs.

Normal API startup depends on emitted JavaScript from `@tranhanh/shared`; development commands build that package first.
Vehicle creation uses Prisma's nested relation ownership and does not repeat the composite child `userId`. Monitoring
jobs whose previous outcome failed may execute their BullMQ retry even while the persisted next-eligible timestamp is in
the future; ordinary early or stale jobs remain gated.

Compose mounts PostgreSQL 18 at /var/lib/postgresql per the
[official image guidance](https://docs.docker.com/guides/postgresql/). No existing volume was removed or migrated in Phase 5.
If a volume has older data, inspect/backup and plan its upgrade separately; changing a mount is not a data migration.

## Phone-prefix backend (Phase 6)

### Schema and evidence

TelecomOperator owns immutable key, canonical brand name, normalized searchName, website, active state and evidence FK.
PhonePrefix has a unique string prefix (leading zero retained), operator FK, ACTIVE/LEGACY/INACTIVE state, optional UTC
half-open effective interval, required evidence FK and importedAt separate from row updatedAt. Current prefix families
have three digits; supported historical mobile families have four. There is no subscriber/phone-number table.
PhonePrefixMigration has a unique old-prefix FK, new-prefix FK, nullable effectiveAt and independent evidence FK.
The operator is resolved through the prefix relation, not duplicated on the migration row. SourceReference gains an
optional title so consumers can display the actual document along with publisher URL, publication and retrieval times.

Migration 20260911010000_add_phone_prefix_lookup leaves Phase 5 SQL intact. It adds three tables, one enum and the nullable
evidence title, with no data inserts or destructive operations, wrapped in BEGIN/COMMIT. Three unique indexes cover
operator key, prefix and old migration endpoint. Six query indexes cover operator/status/prefix listing, status/prefix,
evidence joins and replacement lookups. Six FKs explicitly RESTRICT deletes/identity updates. Four SQL CHECKs enforce
operator key syntax, status/number shape, effective interval and distinct migration endpoints. Cross-row operator/status
consistency is enforced by the complete dataset validator/importer; foreign keys alone do not validate that business rule.

No automatic migration/import happens at application startup. Runtime requests query Prisma only; no JSON fallback,
hardcoded factual service results, external provider calls, Redis cache or full-text engine. Deployment must apply
migrations and explicitly run the reviewed importer before factual results are available.

### Parsing and query API

PhonePrefixesModule owns thin controllers and a focused Prisma-backed service under /api/v1/phone-prefixes:

- GET /:prefix: exact three/four-digit candidate; unknown allocation returns 404, malformed input 400.
- GET /lookup?value=...: plain prefix or structurally valid current/legacy mobile number; only extracted prefix survives.
- GET / and /search: q, prefix starts-with, operator key, status, page and pageSize; prefix ASC only.
- GET /:prefix/related: up to 12 active prefixes of the same allocated operator, excluding the requested prefix.

Static lookup/search routes are declared before the parameter route. Request DTOs reject unknown fields, arrays,
unsupported status/sort inputs and oversized values. Pages are one-based, maximum 10000; pageSize defaults to 20 and is
bounded at 100. Search uses a reusable Vietnamese diacritic/case normalizer against stored searchName while retaining
canonical names; no fake brand translations or SQL concatenation. Small dataset searches need no extra search index.
Counts and rows use one repeatable-read Prisma transaction; ordering is deterministic. No historical as-of API is claimed.

The parser accepts domestic 10-digit mobile shape, historical 11-digit mobile shape, and +84/0084/84 equivalents with
single spaces/hyphens between digit groups. International input must omit the domestic trunk zero. Letters, unsupported
country codes, landlines, repeated separators, extensions, punctuation and wrong lengths return 400. A numeric 3/4-digit
candidate can return 404; syntax alone never establishes an allocated prefix. Legacy full numbers require an actual
legacy database mapping; no old number is declared currently dialable. URL-encode a leading plus sign as %2B.

Shared PhonePrefixResult/PhonePrefixPage/PhonePrefixQuery/PhoneSource/PhoneMigration contracts are independent of Prisma.
They expose canonical operator identity, explicit previous/replacement mappings, null unknown effective times, evidence,
last content-changing importedAt and database updatedAt. Public responses omit internal IDs and subscriber digits.
operatorResolution=PREFIX_ALLOCATION and currentSubscriberNetworkVerified=false distinguish allocation from mobile-number
portability, shared subranges, current serving network and subscriber existence. Swagger documents nested responses,
validated parameters, examples using reviewed prefix facts, 400/404 and safe database-unavailable responses.

### Import and privacy

The reviewed JSON holds source/publisher/reference identities, operators, prefix rows and migrations. Joi structural
validation plus semantic checks run before persistence. Import is a bounded transactional upsert with an advisory lock;
no deletion, silent reassignment or legacy-target replacement. Evidence snapshots cannot be changed in place. Identical
imports do not rewrite prefix updatedAt/importedAt. Separate generic SyncRun audits record actual attempts and measured
prefix create/update/skip counts. Audit/bootstrap metadata can survive a failed domain transaction; partial domain data
cannot. The source registry documents exact coverage, source review and maintenance steps.

Nest currently has startup/error logging, not access logging of request query values. No new request logger is added;
normalization strips subscriber digits before queries, exceptions use fixed messages, and import logs only summary counts
or safe errors. /lookup sends no-store and no-referrer headers on successful responses. Browser history and deployment
proxy/APM logs are outside this server's control: configure them to omit query values and reject/full-mask number paths;
prefer prefix-only input. No phone numbers are persisted, echoed, enriched or sent to external services.

Unit/HTTP tests use explicitly synthetic fixtures where a database would otherwise be required; these are not PostgreSQL
constraint proof. The guarded test:database suite adds 13 real tests to the 16 Phase 5 tests, including actual repeated
imports, evidence joins, uniqueness, FK/delete rules and CHECK constraints. Fixtures roll back and refuse to overwrite
pre-existing prefix keys. Docker remains unavailable; live migration, import, PostgreSQL tests, Redis and successful
readiness are pending. Angular/SEO behavior is unchanged; Phase 7 owns the public frontend and SEO routes.

## Phone-prefix frontend and SEO — Phase 7

- Localized index/detail routes: `/vi/tra-cuu/dau-so[/:prefix]` and `/en/lookup/phone-prefix[/:prefix]`.
  `phonePath` is shared by route equivalence, links and sitemap. The homepage gets one real feature link.
- A route resolver awaits the real API before SSR renders. The typed client imports shared public contracts,
  validates untrusted JSON, URL/date fields and allocation semantics, and bounds requests to five seconds.
  `API_ORIGIN` is server-only request context; browser requests use a narrowly scoped same-origin Express gateway.
  Angular dev-server has a local API proxy. No Prisma types or authoritative dataset enter browser business code.
- Angular TransferState carries successful public catalogue/detail/related responses through hydration, then consumes
  them once. The browser test verifies only two upstream requests for initial detail+related SSR and hydration.
  Submitted lookup values never enter TransferState. There is no persistent frontend data cache.
- Index groups active prefixes by operator with a local operator filter and a separate legacy section.
  Reusable typed result cards put the answer first, followed by source evidence, dates, related links and history.
  Related requests may fail independently without hiding the primary answer. Initial HTML is never just a loading shell;
  existing pages expose a status indicator while client navigation resolves.
- Search delegates normalization to `/lookup`, clears the input, and navigates only to the returned prefix.
  Validation, unknown search and unavailable service messages are localized and associated with the labelled input.
  Browser storage/history and metadata never intentionally receive subscriber numbers. Reverse proxies/APM must omit
  lookup query strings from logs because the existing backend transport is GET. Phone language switching drops queries.
- Vietnamese current answers say “Đầu số 086 được phân bổ cho Viettel.” Equivalent English says “is allocated to”.
  Neither claims the subscriber's current serving network. A restrained MNP note explains number portability.
  Legacy cards state old/new mapping and never invent an effective date. Source publication/retrieval, allocation dates,
  and record update dates have distinct labels. Original source titles remain in their original language.
- The existing SEO service owns titles, localized descriptions, OG, canonical, equivalent hreflang and JSON-LD.
  WebPage and visible BreadcrumbList match; the conceptual Lookup parent has no nonexistent link.
  Error pages return real 404 (unknown/malformed route) or 503 (unavailable/malformed API or empty catalogue), with
  noindex and no canonical/alternates. Query variants are noindex, with a clean canonical only for valid pages.
- `/sitemap-phone-prefix.xml` reads the API catalogue, includes both index routes and only returned active/legacy
  prefixes, and appears in the sitemap index only when nonempty. With the Phase 6 catalogue this means 116 URLs.
  No full number/query, design-system or arbitrary combination is generated. Public-origin/indexing safeguards remain.
- Tests use typed Angular mocks and a standalone HTTP adapter under `apps/web/test`; neither is a production fallback.
  Real PostgreSQL-backed SSR remains pending until Docker, migrations and the reviewed import are available.

## Fixed-line area-code backend — Phase 8

The Nest `AreaCodesModule` is a backend-only domain under `/api/v1/area-codes`: list, `/search`, `/lookup`,
`/:code`, and `/:code/related`. No area-code Angular routes, SEO metadata or sitemap URLs are created in this phase.
The reviewed file contains 63 active and 59 historical codes; production services query PostgreSQL, not the JSON file.

`AreaCode` references a stable `TelecomLocality` service area. Its `TelecomLocalityGroup` records a sourced contemporary
telecom grouping; multiple codes can remain active together after administrative restructuring. Neither model is an
administrative unit, and there are no wards, communes, administrative identifiers or a national administrative hierarchy.
Future administrative integration should add explicit dated links to canonical administrative units rather than replace
telecom IDs or infer correspondence by name. A future regrouping needs reviewed membership history; the current importer
refuses to overwrite names/membership blindly. A temporal membership join can be added without replacing area-code IDs.

`AreaCodeMigration` links an old code to its verified current target with source and transition-start date. The new
`20260911020000_add_area_code_lookup` migration is additive: four tables, one enum, four unique and eight query indexes,
eight RESTRICT foreign keys and five CHECK constraints. Existing migrations are unchanged. SQL-only CHECKs enforce stable
keys, domestic code/status format, date intervals and distinct migration endpoints. Required alias arrays are NOT NULL.
Cross-row locality/status mapping consistency is validated in the importer, not claimed as a PostgreSQL CHECK guarantee.

Calendar dates use PostgreSQL DATE and serialize as YYYY-MM-DD, avoiding fake timestamp precision. SourceReference
publication/retrieval instants and actual import/update clocks retain their existing semantics. Source-era locality names,
contemporary groups, predecessors and replacements are exposed through shared contracts independent of Prisma. The
existing source DTO shape is reused; no English name translation or frontend SEO copy is invented by the API.

Normalization first validates bounded syntax. Code-only input supports domestic zero, omitted zero, +84/0084/84,
spaces/hyphens, and a trailing hyphen. Exact routes require canonical domestic code format; `/lookup` performs normalization.
Full current fixed-line input requires 11 domestic digits including trunk zero and uses the longest matching known ACTIVE
code, not a guessed fixed prefix length. This is structural parsing, not subscriber validation. Full legacy numbers are
rejected because of overlap with mobile ranges; legacy code-only queries preserve their historical identity.
Malformed input is 400, a structurally valid unknown code is 404, and database failures use the existing sanitized policy.

The subscriber suffix remains only in request memory. DB operations for number lookup read active code keys, then query
the normalized code only. Responses never echo numbers, and lookup uses no-store/no-referrer headers. There is no query
logger or new analytics. Deployment reverse proxies/APM must continue excluding raw lookup query strings. Search accepts
locality/alias text or at most four numeric digits; full numbers belong only in `/lookup`.

List/search uses bounded pagination, deterministic code ordering and a repeatable-read count/page transaction. Search
reuses the existing accent-insensitive normalizer across service-area names, reviewed group names and limited aliases.
Filters are explicit code/locality/group/status fields. Related results include same-area historical/current codes and
active codes in the same reviewed group, never unrelated SEO links. No Redis cache, external search engine or parser
for global search is added.

The validated file importer follows the existing transactional reviewed-import/audit pattern, with a separate advisory
lock and provider key. Immutable evidence, assignment and retained-history guards prevent silent overwrites; no omissions
cause deletion. Typed memory fixtures exercise service/HTTP/import decisions only. Eighteen new guarded PostgreSQL tests
are compiled but pending, alongside the 29 earlier cases, until local Docker services are available.

## Area-code frontend and SEO — Phase 9

The bilingual public routes are /vi/tra-cuu/ma-vung[/:code] and /en/lookup/area-code[/:code]. A route resolver
awaits the typed Area Code API client before server rendering, so valid current and legacy pages contain their direct
answer, telecom locality, status, history and source in raw HTML. Successful catalogue/detail/related responses use
Angular TransferState once during hydration; submitted landline values never enter transfer state or persistent storage.
The server-only API origin and narrowly scoped same-origin gateway follow the Phone Prefix deployment pattern.

The index groups current codes by sourced telecom-locality group and separately lists verified legacy mappings. Group
labels are not presented as administrative regions. Locality search delegates aliases and accent folding to the backend
and displays all matches instead of choosing an ambiguous locality. Numeric/formatted/full-landline input delegates to
the lookup endpoint, clears the input and navigates only to the returned canonical code path. No subscriber digits enter
canonical URLs, metadata, HTML, local/session storage or a frontend cache.

Current pages answer where the code is used. Legacy pages retain their own URL and explicitly link old code, current code,
locality and verified transition date; they do not redirect to the replacement. Visible source cards distinguish source
publication, code effective dates, source review and record update. A concise note explains that telecom allocation names
may differ from current administrative-unit names. Vietnamese and English copy preserve canonical Vietnamese proper names.

Valid pages receive localized title/description, clean canonical, paired vi/en hreflang, WebPage data and a BreadcrumbList
built from the same visible model. Unknown or malformed code paths return HTTP 404 and noindex; unavailable/malformed API
responses and empty catalogues return 503 and noindex. Query variants are noindex. /sitemap-area-code.xml contains two
index pages plus both locale paths for all 63 current and 59 verified legacy codes: 246 URLs. It excludes queries, full
numbers and unknown codes and is included independently in the sitemap index only when its API catalogue succeeds.

The answer-first layout uses Phase 2 tokens and stacks at narrow widths. One headless browser covered six routes at 320,
375, 390, 430, 768, 1024, 1280 and 1440 pixels, transfer-state behavior, locality search and number privacy.
Representative light/dark screenshots at 390 and 1440 pixels were visually reviewed and then removed. Production data
still requires the pending PostgreSQL migrations/import; test adapters are isolated from production code.

## Vehicle-plate backend — Phase 10

VehiclePlateTarget models a source-era public allocation target and explicitly distinguishes a locality from the central
traffic-police authority. It does not model administrative ancestry. VehiclePlateAllocation has a stable key, two-digit
numeric prefix, optional source-backed series prefix, current target, status, calendar effective interval, evidence, and
import clocks. Numeric prefix is intentionally not globally unique: a later official instrument can add distinct
series-specific allocations. The migration enforces uniqueness of numericPrefix plus nullable-series scope with an
expression index. VehiclePlateAllocationHistory retains the prior target, nullable unknown start, required transition
end, previous allocation evidence, and separate transition evidence. All evidence and target deletes are restricted.

The API exposes list/search/lookup/exact/related endpoints under `/api/v1/vehicle-plates`. Exact and lookup responses use
a wrapper containing parsed public allocation components and every matching allocation. `ambiguous` is derived from the
result count, so the service cannot silently select a locality when a numeric prefix has multiple sourced allocations.
The current snapshot is numeric-only; parsed series is transparent and `seriesAllocationVerified=false`. Related results
share the current allocation target. Search is deterministic, paginated, accent-insensitive, and limited to public
allocation facts.

Full-plate parsing exists only to extract numeric prefix and optional public series. Registration serials are discarded
before Prisma and never appear in DTOs, errors, audit records, caches, or external requests. No vehicle/owner existence,
registration status, plate validity, location, or category is inferred. The reviewed JSON importer follows the existing
transactional source/audit pattern, with immutable references and refusal of silent target/identity changes.

## Vehicle-plate frontend and SEO — Phase 11

The API boundary validates nested target/history/source records and coherent ambiguity, prefix and series flags.
The route resolver awaits catalogue/detail evidence before rendering and transfers successful public results once for
hydration. Related failures omit that supplemental section. Empty/malformed/unavailable data returns 503; invalid or
unknown prefix paths return 404. Neither error state publishes canonical/hreflang metadata.

Index pages group all current allocations by target. Detail pages render every allocation for ambiguous input, dated
previous targets and source/transition references, without implying issued plate invalidity. Full-input lookup clears the
form immediately and navigates only to validated prefix/series; it never adds submitted serials to metadata or storage.
The shared deployment requirement to omit GET lookup values from proxy/APM logs also applies to vehicle lookup.

Numeric allocation URLs are the SEO identity for the current dataset. A generic series such as 51K remains useful as a
contextual page but uses noindex and a numeric /51 canonical; the existing SEO service omits hreflang on noindex pages.
Source-backed series allocations can have distinct pages. The vehicle sitemap lists only allocation-derived URLs and
fails closed for empty/unavailable data. It is independent of existing phone/area segments. No series permutations or
full-plate pages are generated. All pages use the existing design system, locale routing, and same-origin API gateway.

## Postal-code backend — Phase 12

Vietnamese postal codes are stored as five-character digit strings, so leading zeroes survive every API, dataset and
persistence boundary. `PostalCodeTarget` is a source-era postal assignment target with a stable internal key, canonical
Vietnamese name, aliases, normalized search text, explicit type and optional parent. The current hierarchy has only the
levels exposed by Decision 2334/QĐ-BKHCN: 34 province/city parents and ward, commune or special-zone children. It does not
claim to be the future canonical administrative model; stable keys and explicit parents allow a later reviewed link.

`PostalCodeAssignment` keeps code-to-target multiplicity possible while enforcing one mapping per code/target pair.
The current reviewed snapshot happens to contain unique codes. Exact lookup returns every official match and locality
lookup never chooses one code from an ambiguous result. Related results are bounded siblings under the same sourced
province/city parent. Search uses indexed code fields and normalized target/parent text; no external search or cache is
needed for this dataset size.

Publication, effective, retrieval, import and database update timestamps retain distinct meanings. The 2025 amendment is
modeled as the current snapshot, not fabricated historical continuity. Omitted assignments are never deleted by import.
Identity, hierarchy or assignment changes require reviewed evidence and an explicit reconciliation/history decision.
The source's invalid six-digit Tam Dương Bắc value is a structured anomaly with no assignment, rather than silently
truncated. The separate Hải Phòng government publication resolves the central PDF's `#VALUE!` cell for Xã Nghi Dương.

The importer validates all hierarchy, evidence, code, date and uniqueness rules before a transactional upsert under an
advisory lock. API contracts under `/api/v1/postal-codes` are framework-neutral and do not expose Prisma rows. Requests
accept codes or public locality names only; the service neither accepts/stores full addresses nor stores lookup queries.

## Automotive product architecture — Phase 12P

### Product and information architecture

TraNhanh is a working label for a web-first assistant for Vietnamese drivers, vehicle owners, families managing one or
more vehicles, and people researching vehicle and traffic information. Public acquisition starts with source-backed,
SSR-rendered automotive tools that work without an account. Vehicle Plate Lookup is the current first-class feature.
Phone Prefix and Area Code remain functional secondary utilities to preserve useful routes and search equity. The Postal
Code backend remains intact but dormant, with no frontend, navigation entry, SEO landing page, or sitemap segment.

Primary public navigation exposes only implemented destinations: Home and Vehicle Plate Lookup. Future areas such as
Traffic Fine Lookup, Fuel Prices, Traffic Rules, and Vehicle Tools appear only as clearly unavailable product direction
until their phases ship. Future authenticated navigation may add My Garage, Dashboard, Fuel Log, Maintenance, Expenses,
Reminders, and Notifications. Authentication must never become a prerequisite for public lookup.

### Public and private boundaries

Public domains contain vehicle-plate allocation references, one-time traffic-fine results, fuel prices, traffic-rule
references, and public calculators/tools. They may participate in SSR, canonical/hreflang output, structured data, and
sitemaps when the source and page satisfy the existing indexing policy. DataSource, DataProvider, SyncRun, and
SourceReference remain the provenance boundary for sourced automotive facts and expose source, provider, retrieval or
update time, and effective dates where useful.

Private domains contain saved vehicles, monitoring subscriptions, fuel logs, maintenance histories, expenses, reminders,
document dates, and notification histories. Every private entity must be owner-scoped and authorization-checked. Private
identifiers and facts must not enter public routes, canonicals, hreflang, structured data, sitemaps, analytics, or routine
server logs. Complete license plates should be accepted, retained, and logged only when a feature has a documented need;
public prefix lookup continues discarding registration serials before persistence or queries.

### Future domain boundaries and dependencies

The future domain sequence is User and Session/Auth, then Vehicle and VehicleMonitoring, followed by TrafficFine,
VehicleDocument, Reminder, FuelPrice, FuelLog, Maintenance, VehicleExpense, and Notification. User/Auth supplies identity
and sessions. Vehicle owns private owner-to-vehicle membership. Monitoring references an authorized vehicle and a public
provider adapter; it does not make public reference data depend on a user. Documents, reminders, logs, maintenance, and
expenses depend on an authorized vehicle identity. Notification consumes explicit domain events and user preferences;
it does not own business truth. Public source adapters remain independent of private account records.

These boundaries are documentation only in Phase 12P. Phase 13 begins identity and session work; no account model, login,
JWT/session, My Garage, monitoring, traffic-fine provider, or new automotive persistence is introduced here. REST contracts
remain framework-neutral and suitable for a future native client, while responsive Angular SSR stays the only client now.

### SEO, privacy, and route preservation

The homepage metadata and WebSite description now identify the driver and vehicle assistant direction without claiming
unreleased features. WebSite remains the only homepage schema; no site search exists, so there is no SearchAction. The
existing Vehicle Plate, Phone Prefix, and Area Code paths, detail pages, canonicals, alternates, structured data, robots
policy, and sitemap segments remain unchanged. Product prominence and indexing are separate decisions: de-emphasized valid
pages can continue serving users and attracting search traffic. No Postal sitemap or public route is introduced.

## Authentication — Phase 13

### Identity and persistence

`User` is the private account identity: normalized lowercase email, Argon2id password hash, optional display name, explicit
ACTIVE/DISABLED/PENDING_DELETION status, login/password/deletion timestamps, and durable audit timestamps. The database
requires normalized unique email and consistent pending-deletion state. Hard deletion is not an API operation; requesting
deletion marks the account, revokes sessions, and preserves restrictive security/history relationships for a later reviewed
retention workflow. No email verification timestamp exists because email verification is not implemented.

`AuthSession` represents one refresh capability in a rotation family. It stores keyed SHA-256 hashes of refresh and CSRF
secrets, absolute expiry, use/revocation time, and an optional unique replacement relationship. Raw capabilities exist only
in secure client state and reset delivery. Rotation creates a successor inside one transaction, revokes the predecessor,
and preserves the original family expiry so activity cannot extend a refresh family indefinitely. Reuse of an already
revoked/replaced capability revokes its remaining family. `PasswordResetToken` is similarly hashed, expiring and one-time.
Expired/revoked rows are eligible for opportunistic deletion after a 30-day audit window; no scheduler was introduced.

### Browser session, CSRF, CORS, and native readiness

The access credential is an HS256 JWT with issuer/audience, random JTI, user ID, session ID, issued time and a 15-minute
expiry. It contains no email, profile, password, role, or vehicle data. Every protected request verifies the JWT and the
current server-side session/user state, enabling immediate revocation. Browser access and refresh cookies are HttpOnly and
SameSite=Strict. CSRF uses a non-HttpOnly random cookie, matching request header, and session-bound keyed hash; a supplied
Origin must exactly equal `WEB_ORIGIN`. Production validation requires HTTPS, Secure cookies, and independent strong secrets.
Credentialed CORS is restricted to the configured origin and never uses a wildcard.

The web contract does not expose refresh/access tokens in JSON. A future native client can add an explicitly reviewed token
transport while reusing users, session rotation and bearer-capable guards. Long-lived credentials never use localStorage.
Auth rate limits apply only to register/login/reset/refresh/security endpoints and currently use bounded per-process memory;
a horizontally scaled deployment should use shared Redis counters. Public lookup controllers have no global auth guard.

### Password, reset, logging, and authorization

Argon2id uses 19 MiB memory, two iterations and one lane. Passwords accept 12–128 characters including spaces/symbols and
have no arbitrary composition rule. Missing users perform a dummy Argon verification; login failures are generic. Forgot
password responses are identical for present/missing accounts. Reset delivery is an injectable provider: development/test
keeps a token only in process memory for tests, while production silently requires a future reviewed email adapter and never
logs a secret. Successful reset or password change updates passwordChangedAt and revokes all sessions.

Nest has no request-body/header logger. The security redaction helper covers password variants, Authorization, Cookie,
Set-Cookie, access/refresh/reset tokens and password hashes for any future structured logging. API DTOs whitelist inputs;
responses map to `AuthUser` and never serialize Prisma rows. `AccessAuthGuard`, `CsrfGuard`, and `CurrentUser` provide the
Phase 14 ownership foundation; future resources must compare their owner user ID with the authenticated stable user ID.

### Angular SSR, routes, and SEO

Angular initializes auth only in the browser by calling `/auth/me`; server rendering remains anonymous and request-isolated.
No user or token enters TransferState, HTML, local/session storage, canonical metadata, structured data, sitemap output, or
public page caches. The same-origin Express gateway forwards only the necessary auth headers/body/cookies, copies Set-Cookie,
uses no-store/no-referrer/noindex, limits JSON to 32 KiB, and never logs payloads. Account SSR renders a neutral loading state;
a browser guard redirects an anonymous hydrated client to localized login.

Localized login, register, account, forgot and reset routes use semantic forms, password-manager autocomplete, labels, live
status/errors, the existing theme/language system and mobile-first layouts. All use `noindex, nofollow` and remain outside
sitemaps. The header shows login/register for anonymous users and account/logout after browser authentication. Public Vehicle
Plate, Phone Prefix and Area Code routes remain anonymous. Social login, MFA, roles/admin, and later vehicle workflows remain deferred.

## My Garage ownership and privacy — Phase 14

`Vehicle` is a private aggregate owned by one stable `User.id`. Application reads and mutations select with both vehicle ID
and authenticated user ID; an ID alone is never an authorization boundary. A per-owner normalized plate key allows the same
plate string in separate accounts while preventing duplicate saved records inside one account. PostgreSQL also enforces one
active primary vehicle per owner with a partial unique index. Primary changes run in one transaction. Archive state requires
an archive timestamp and a non-primary record; restore always returns a non-primary active record.

The saved-vehicle normalizer accepts common Vietnamese separators and casing, stores one normalized key and one canonical
private display value, and does not call or extend the public plate-allocation lookup. Model year, odometer and text bounds
are checked at DTO/service boundaries, with durable database checks for numeric and archive invariants. Odometer rollback is
rejected unless the update explicitly carries the correction flag.

All Garage endpoints require an active server-side auth session; cookie mutations additionally require session-bound CSRF
and trusted Origin. Responses use private no-store, no-referrer and noindex headers. The web server forwards the private API
without caching or logging content. Angular renders only a neutral private loading shell on the server and loads vehicle data
in the browser after auth initialization. Garage routes use opaque UUIDs, private robots metadata, no structured data, and
are excluded from sitemap generation. No vehicle data uses TransferState or browser storage.

## Traffic-fine lookup backend — Phase 15

The public boundary is POST /api/v1/traffic-fines/lookup. A full plate appears only in the validated request body; the
response contains a masked display value. The route is public, returns no-store/no-referrer/noindex headers, and applies
a bounded in-process IP limit of 10 attempts per 10 minutes. The limiter retains only an IP bucket and timestamps, not
plates. A multi-instance deployment must move anonymous counters to a shared store before relying on a global limit.

TrafficFinesService depends on the TrafficFineProvider interface rather than a website. Providers publish identity,
official status, vehicle coverage, automation mode, CAPTCHA/auth requirements, freshness semantics and operating status.
The production adapter is deliberately MANUAL_ONLY and DISABLED for automation: it returns the official CSGT link and
MANUAL_VERIFICATION_REQUIRED without an external request. Provider throttling, retry, timeout and circuit logic are not
instantiated because no automated provider is active. Any future automated adapter must add those controls at the
provider boundary without changing the public controller contract.

Provider records are validated and normalized into nullable source-faithful fields. Dates remain calendar dates when that
is all the source supplies; timestamps require an explicit offset. Location, behavior and status wording are preserved,
and UNKNOWN is used when a justified universal status mapping is absent. A SHA-256 fingerprint covers provider identity,
time, location, behavior, authorities, normalized status, provider wording, source update time and safe public reference.
It excludes the submitted plate and all raw/private provider fields. Equal fingerprints are deduplicated deterministically;
records differing in any meaningful normalized field remain separate.

RESULTS_AVAILABLE, NO_MATCHING_RECORDS, MANUAL_VERIFICATION_REQUIRED, SOURCE_UNAVAILABLE and UNSUPPORTED are distinct.
No-match means only that the selected provider returned no matching records within its coverage. Provider errors become
bounded 502/503 responses without upstream HTML, exception text or query data. Full raw payloads, plates, queries and
results are neither logged nor persisted. No database model, migration, audit hash, cache, Redis queue or BullMQ job is
needed for one-time anonymous lookup. Phase 17 can reuse provider records and plate-independent fingerprints for saved-
vehicle monitoring after adding owner-scoped persistence and a reviewed automated source.

## Traffic-fine frontend and SEO — Phase 16

The localized public pages are /vi/tra-cuu/phat-nguoi and /en/lookup/traffic-fines. Angular SSR renders only static
explanation, source transparency, form shell, breadcrumbs and SEO metadata. It never submits a lookup on the server and
never places a plate or response in TransferState. Browser submission uses the same-origin Express gateway and POST body;
the gateway forwards only JSON to the exact backend route, caps the body at 4 KiB, applies an eight-second timeout, returns
no-store/no-referrer/noindex headers, and does not forward credentials or log request content.

The component clears the input immediately after creating the request, stores no recent searches, cancels an earlier
request on resubmission, ignores stale completions, and focuses the result/status region. It maps 400, 429 and provider
failures to localized bounded copy. Provider responses are runtime-validated, including HTTPS source URLs, masked plates,
capabilities, result coherence and normalized record shapes. Manual verification, unavailable, unsupported, provider-
scoped no-record and future result states remain distinct. Full plates never enter routes, query parameters, fragments,
titles, descriptions, canonicals, alternates, JSON-LD, storage, analytics, breadcrumbs or console output.

The static pages are indexable only under the existing explicit public-origin/indexing policy. Each has one canonical,
paired vi/en alternates, WebPage and visible-derived BreadcrumbList data. Structured data contains no submitted state.
Only the two static page URLs join the static sitemap; no result route exists. Traffic Fine Lookup and Vehicle Plate Lookup
are the two first-class homepage tools and appear in desktop/mobile navigation and the footer. The official link never
includes the plate and is marked as an external noopener/noreferrer destination.

## Vehicle Monitoring — Phase 17

VehicleMonitoring is a private preference attached to an owning User and Vehicle, unique by vehicle and typed monitor.
VehicleMonitoringRun is a sanitized execution audit and VehicleMonitoringSnapshot keeps only the latest provider key,
retrieval time, result count and sorted plate-independent fingerprints. Neither table duplicates the full plate or stores
raw HTML, CAPTCHA, provider payload, notes, credentials or contact information. Vehicle deletion/account lifecycle cascades
monitoring artifacts; normal product behavior archives vehicles and retains history while stopping future scheduling.

The monitoring policy maps the traffic-fine provider contract to AUTOMATED, LIMITED, MANUAL_ONLY or UNAVAILABLE and derives
a ready-to-render effective status. The official CSGT adapter is MANUAL_ONLY, so an enabled preference is
ENABLED_BUT_MANUAL: no job, run, snapshot, last-success timestamp or next-eligible timestamp is created. Capability
degradation clears future scheduling while preserving preference. An upgrade to an automated provider cannot silently
activate a stored manual-era preference; automationApprovedAt is set only by a fresh enable action against an eligible
provider.

Eligible providers use the `vehicle-monitoring` BullMQ queue and `vehicle-monitoring-check` job. Payloads contain only
monitoringId; the worker resolves the authorized private vehicle server-side. Stable due-time job IDs deduplicate dispatch,
one-provider concurrency and a minimum interval limit request pressure, and delayed jobs represent the configurable
24-hour default. Transient failures use bounded exponential retry, rate limits use controlled delay, manual/unsupported
conditions do not retry, and five consecutive failures suspend the monitor. A success resets the failure count. Sorted
fingerprint-set comparison ignores ordering, duplicate records and retrieval timestamps while detecting added, removed or
materially changed normalized records. changeDetected is an internal hook for the future Notification Center; Phase 17
sends no email, Telegram, web push or native push.

The private API is nested under `/api/v1/vehicles/:vehicleId/monitoring` with get, enable, disable and history actions.
Every query includes userId and vehicleId; mutations use the existing cookie CSRF/origin guards. Garage monitoring is
client-fetched after hydration, no-store/noindex, absent from TransferState and all public SEO/sitemap surfaces.

## Vehicle Documents and Expiry Reminders — Phase 18

VehicleDocument is private data nested under a saved vehicle. Its composite vehicle and user foreign key prevents
cross-account attachment. Six explicit types cover registration, periodic inspection, compulsory and voluntary insurance,
road-use fees, and other documents. PostgreSQL DATE values and strict YYYY-MM-DD API values preserve Vietnam calendar dates.
Every record is visibly USER_PROVIDED; TraNhanh does not claim government, insurer, or registry verification.

Each document owns reminder preferences for 30, 15, 7, and 1 day before expiry. The vehicle-document-reminders BullMQ
payload contains only an opaque reminder ID. The worker resolves current document and vehicle state server-side, ignores
stale jobs, and records at most one run per reminder and expiry. Stable job IDs plus a database unique constraint make
execution idempotent. A missed job has a seven-day grace period and never runs before its due date or after expiry. Queue
dispatch failure does not roll back a saved document. This phase records internal events and sends no external notification.

The authenticated API is nested below /api/v1/vehicles/:vehicleId/documents. Every operation filters by userId and
vehicleId; foreign IDs return safe 404. Mutations retain origin and CSRF guards and responses remain private/no-store.
Archived documents retain preferences but clear schedules; archived vehicles cannot receive schedules.

Localized routes are /vi/garage/:id/giay-to and /en/garage/:id/documents, with add, detail, and edit children. They render
a neutral SSR shell, fetch only in the authenticated browser, use no TransferState or browser persistence, and stay out of
sitemaps and structured data. List cards omit reference numbers; full metadata appears only on the private detail page.

## Fuel Prices — Phase 19

`FuelProduct` owns an immutable kebab-case product key, the current official source label, unit, maximum-retail-price
semantics and display order. `FuelPriceSnapshot` is append-only publication evidence: exact VND `BIGINT`, effective period,
publication/retrieval instants, publication number, deterministic SHA-256 fingerprint, and explicit product, DataSource,
DataProvider and SourceReference foreign keys. Current price is the latest snapshot whose `effectiveFrom <= now`; previous
price is the immediately preceding applicable snapshot for the same product. Creation time never decides applicability.

The reviewed Ministry provider is `MANUAL_ONLY`. It parses a versioned local structured input with strict complete-set
validation; controllers never know parsing details. A successful import is transactional and audited in SyncRun. Historical
snapshots are never overwritten or deleted by routine imports. Provider failure only updates safe audit state, leaving last
known good values available. The public API returns exact integers as decimal strings and computes signed changes using
BigInt. Percentage is rounded to two decimal places using integer arithmetic; it is null without a positive prior price.

Public endpoints are `GET /api/v1/fuel-prices/current` and `GET /api/v1/fuel-prices/history`. History is newest-first,
accepts one known product and an at-most-366-day range, caps page size at 100, and rejects unknown parameters through the
global validation pipe. The current response includes source, semantics, effective, publication and retrieval timestamps,
plus ten-day staleness and provider-degradation signals.

The bilingual SSR routes `/vi/gia-xang` and `/en/fuel-prices` resolve both current data and bounded recent history before
rendering, place public data in TransferState to avoid hydration duplication, and return an honest 503/noindex response when
no verified dataset can be rendered. Actual prices, units, effective time and source appear in raw HTML. Static canonicals,
paired hreflang, WebPage and BreadcrumbList structured data, and exactly two static sitemap URLs reuse the SEO foundation.

## Private Fuel Log (Phase 20)

FuelLogEntry belongs to one User and one saved Vehicle through the established composite ownership relationship. All service queries include userId and vehicleId; cross-owner access returns a safe 404. Mutations use trusted-origin, access-auth and CSRF guards. Responses are private/no-store/noindex. Angular SSR emits only the authenticated feature shell; transaction values are fetched in the browser and never enter TransferState, sitemaps or structured data.

Quantity is DECIMAL(10,3) liters and transaction money is BIGINT VND. The database stores quantity and total cost as authoritative inputs. Actual VND/liter, L/100 km and cost/km are derived with Prisma Decimal arithmetic and rounded only in API presentation. Public Ministry maximum prices are independent reference data and are never copied into a private purchase.

The deterministic calculation service orders active entries by refueling instant and odometer. A completed interval starts at a full-tank baseline and includes every later partial fill through the next full-tank entry. It requires positive distance. Overall consumption divides total interval liters by total interval distance, avoiding a naive average of ratios. Open, first-baseline and zero-distance sequences return explicit availability codes and no numeric economy. Archive, restore and history edits recalculate on read, so no stale aggregate rows exist.

Backfill validation compares the entry with chronological neighbors inside the mutation transaction. A newer higher reading raises Vehicle.currentOdometerKm; corrections and historical edits never lower the vehicle value. Vietnam calendar month boundaries use Asia/Ho_Chi_Minh. Fuel costs stay authoritative in FuelLogEntry for future Phase 22 expense aggregation without duplicate expense rows.

## Private maintenance organizer — Phase 21

`MaintenanceHistory` and `MaintenancePlan` are private records attached to the owning User and Vehicle through composite
foreign keys. Every query includes both owner and vehicle; an ID from another owner or vehicle returns the same safe 404 as
an unknown record. History uses PostgreSQL `DATE` for the Vietnam service date, optional non-negative integer odometer,
optional exact `BIGINT` VND cost, bounded title/category/workshop/notes, and an explicit active/archive lifecycle. A null
cost means unknown; the string `0` is an exact recorded zero. Active history is the only maintenance-cost input reserved
for Phase 22, with no duplicate expense rows.

The additive `20260921030000_add_maintenance` migration carries the composite ownership and completion foreign keys.
The follow-up `20260921040000_align_maintenance_completion_unique` migration aligns the deployed composite unique index
without editing the already-applied migration; direct PostgreSQL status and constraint checks are part of the gate.

intervals or generate recurring rows. Due status is calculated on read from the Vietnam calendar date and the vehicle's
current odometer. Either reached threshold is `DUE`; date within 30 days or odometer within 1,000 km is `DUE_SOON`; an
odometer threshold without a current vehicle odometer is explicitly `UNKNOWN_MILEAGE`. These windows are product constants
and are covered by calculator tests.

Completing an active plan takes one transaction under a vehicle advisory lock: it inserts exactly one linked history row,
updates the plan to completed, and raises the vehicle odometer only when the service reading is greater. The unique linked
history relation and the locked status check make retries return the existing pair without duplication. History corrections,
archive and restore are explicit; archived history is excluded from cost totals, while a completed plan remains linked even
if its history is later archived. Archived vehicles remain readable but block new or active mutations.

The private API is under `/api/v1/vehicles/:vehicleId/maintenance` with bounded history and plan list/detail/mutation,
lifecycle, summary and completion endpoints. Trusted-origin, access-auth, CSRF and private/no-store/noindex response
policies match Garage. Localized `/vi/garage/:id/bao-duong` and `/en/garage/:id/maintenance` pages fetch only after browser
auth initialization, render a neutral SSR shell, use no TransferState/storage/JSON-LD/sitemap data, and show due attention on
vehicle detail. No notification queue, external notification, attachment/OCR, workshop directory or public maintenance route
is introduced.
