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
pg driver adapter and creates connections lazily. No business model or SQL migration exists in Phase 1.

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
