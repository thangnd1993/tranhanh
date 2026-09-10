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
Unsupported locale paths redirect to `/vi`; unknown paths within a supported locale redirect to that locale's home.
This intentional redirect strategy avoids rendering Vietnamese under an invalid URL; a dedicated 404 page can be
introduced by an explicitly scoped later phase. Neither legacy path renders duplicate indexable content.
The showcase retains `noindex, nofollow` in the SSR response header and HTML for both locales.

The guard updates the request-scoped injected document's `html.lang` and existing description before rendering.
Route title resolvers supply translated titles. The browser runs the same resolution before hydration; there is no
server dependency on local storage or unsafe global document/window access. Canonical/hreflang and the SEO metadata
engine remain Phase 4 work.

Tree-shakeable `Intl` presentation helpers provide numbers, ratio percentages, VND, dates, times, and date/time.
They use `vi-VN` or `en-US` and an explicit default timezone of `Asia/Ho_Chi_Minh` to avoid server/browser drift.
Callers supply a Date or epoch instant and may override timezone. Formatting is not business arithmetic or a monetary
rounding policy. Common translation keys cover required/invalid validation and loading, empty, stale, error/retry states.

After a production build, `pnpm test:ssr` starts a temporary SSR server and checks redirects and initial localized HTML.
Set `PLAYWRIGHT_MODULE` to an installed Playwright module and optionally `CHROME_EXECUTABLE` to enable the same script's
headless browser checks. It reuses one browser/context/page and checks viewports sequentially, then closes all resources.
Optional `I18N_SCREENSHOTS=1` writes two temporary representative images for review; delete their reported directory
after inspection. Routine screenshots are not version-controlled.
