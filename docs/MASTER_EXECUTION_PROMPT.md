# MASTER EXECUTION PROMPT

## PROJECT: TRANHANH — VIETNAMESE LOOKUP & DAILY UTILITY PLATFORM

You are the principal software engineer, solution architect, UI/UX engineer, SEO engineer, QA engineer, DevOps engineer,
and technical project owner responsible for building this project from foundation to production readiness.

You must implement the complete application end-to-end.

Do not only produce plans, pseudocode, mockups, partial examples, or architecture documents unless the current phase explicitly
requires them.

Every implementation phase must result in working, tested, committed, and pushed code.

---

# 1. PRODUCT VISION

Build a modern Vietnamese lookup and daily utility platform tentatively branded:

`TraNhanh`

Primary Vietnamese tagline:

`Cần biết gì, tra ngay.`

The platform combines two product concepts:

1. Search-driven lookup tools optimized for organic Google traffic.
2. Frequently used daily utilities that encourage users to return regularly.

The product must feel like one coherent search platform, not a random collection of widgets.

Primary user journey:

```text
Google Search
    ↓
Specific TraNhanh landing page
    ↓
Immediate useful answer
    ↓
Related lookup / calculator / daily utility
    ↓
User discovers TraNhanh
    ↓
Returns directly in the future
```

---

# 2. CORE PRODUCT PRINCIPLES

The application must be:

* SEO-first.
* Data-first.
* Mobile-first.
* Fast.
* Accessible.
* Responsive.
* Clean.
* Modern.
* Easy for non-technical users.
* Useful without requiring an account.
* Vietnamese-first.
* Fully bilingual Vietnamese and English.
* Production-oriented.
* Extensible.
* Legally conservative regarding third-party data.
* Privacy-conscious.

Do not create unnecessary complexity.

Do not add unrelated features just because they are technically interesting.

---

# 3. DEFAULT LANGUAGE

Default language:

`Vietnamese`

Secondary language:

`English`

Vietnamese content must use correct:

* spelling;
* accents;
* grammar;
* terminology;
* punctuation;
* natural Vietnamese phrasing.

Do not produce awkward machine-translated Vietnamese.

English must also be grammatically correct and natural.

Never ship placeholder translations.

Every user-facing string must use the localization system.

---

# 4. CORE PRODUCT AREAS

The final platform should contain the following major areas.

## A. LOOKUP

### Administrative lookup

Support eventually:

* province/city;
* ward/commune;
* old administrative unit;
* new administrative unit;
* old name → new name;
* administrative changes;
* historical mapping where reliable data exists.

Example queries:

```text
Phường Bến Nghé sau sáp nhập thành phường nào?
Phường 5 Quận 3 giờ là phường gì?
```

---

### Postal code lookup

Support:

* province/city;
* district where applicable;
* ward/commune where reliable;
* postal code;
* related areas.

Example:

```text
Mã bưu chính Đà Nẵng
Mã bưu chính Phường Bến Thành
```

---

### Telephone prefix lookup

Support:

* mobile prefixes;
* current operator;
* previous prefixes where applicable;
* old → new prefix transformations;
* active/inactive status if reliable.

Example:

```text
086 là mạng gì?
097 là mạng gì?
```

---

### Landline area code lookup

Example:

```text
0236 ở đâu?
028 là mã vùng tỉnh nào?
```

---

### Vehicle plate lookup

Support data that is legally safe and public.

Lookup must be based on plate prefix/category only.

Never attempt to identify vehicle owners.

Example:

```text
51K ở đâu?
43 là biển số tỉnh nào?
```

---

### Banking identifiers

Support where reliable:

* SWIFT/BIC;
* bank code;
* bank name;
* branch-related data where official and permitted.

Example:

```text
SWIFT code Vietcombank
Mã ngân hàng Techcombank
```

---

# 5. DAILY UTILITIES

## Gold prices

Support:

* SJC;
* DOJI;
* PNJ;
* additional providers only where lawful and reliable.

Fields:

* buy;
* sell;
* delta;
* percentage delta;
* last updated;
* source;
* historical snapshots.

Charts:

* 1D;
* 7D;
* 30D;
* 3M;
* 1Y where enough history exists.

Never fabricate prices.

---

## Exchange rates

Support:

* USD;
* EUR;
* JPY;
* GBP;
* AUD;
* CAD;
* other useful currencies.

Support multiple banks when reliable.

Features:

* buy;
* transfer;
* sell;
* bank comparison;
* currency calculator;
* historical snapshots.

Examples:

```text
1000 USD bằng bao nhiêu VND?
100 triệu VND đổi được bao nhiêu USD?
USD Vietcombank hôm nay
```

---

## Bank savings interest

Support:

* bank;
* term;
* online / at-counter when available;
* interest rate;
* update time;
* source.

Calculator:

```text
principal
term
interest rate
estimated gross interest
estimated maturity amount
```

Clearly state that calculations are reference estimates.

Never present investment guarantees.

---

## Fuel prices

Support:

* E5 RON92;
* RON95;
* diesel;
* other officially published products when useful.

Show:

* current price;
* change;
* effective time;
* previous value;
* history;
* source.

---

## Electricity calculator

Support residential electricity pricing using versioned tariff records.

Input:

```text
kWh
```

Output:

```text
tier breakdown
subtotal
tax
total
tariff version
effective date
```

Never hard-code a forever-current tariff directly into UI logic.

Tariffs must be versioned by effective date.

---

## Weather

Support:

* province/city search;
* geolocation only after explicit user permission;
* current weather;
* feels like;
* precipitation probability;
* humidity;
* wind;
* UV where supported;
* AQI where supported;
* hourly forecast;
* daily forecast.

Always display data timestamp/provider.

---

# 6. FUTURE UTILITIES

Architecture must allow later expansion for:

* scheduled power outages;
* AQI;
* UV;
* lunar calendar;
* public holidays;
* countdowns;
* workday calculator;
* fuel trip cost calculator;
* gold conversion;
* unit converters;
* alerts;
* Telegram bot;
* email notifications;
* push notifications;
* favorites;
* accounts;
* personalized dashboard.

Do not implement all future features prematurely unless their assigned phase requires them.

---

# 7. UNIFIED SEARCH

The main differentiator is one search interface.

Homepage hero:

```text
Cần biết gì, tra ngay.
```

Search examples:

```text
086 là mạng gì
51K ở đâu
0236 là ở đâu
SWIFT Vietcombank
mã bưu chính Đà Nẵng
850 kWh bao nhiêu tiền
500 triệu gửi 12 tháng
1000 USD bao nhiêu tiền
giá vàng hôm nay
thời tiết Đà Lạt
```

Create deterministic intent parsing first.

AI must not be required for simple intent recognition.

Possible intents:

```text
PHONE_PREFIX
AREA_CODE
VEHICLE_PLATE
POSTAL_CODE
ADMINISTRATIVE_LOOKUP
BANK_SWIFT
GOLD_PRICE
EXCHANGE_RATE
SAVINGS_INTEREST
ELECTRICITY_CALCULATOR
FUEL_PRICE
WEATHER
UNKNOWN
```

Parsed example:

```json
{
  "intent": "SAVINGS_INTEREST",
  "amount": 500000000,
  "termMonths": 12
}
```

AI/NLP may later assist with understanding queries, but AI must never generate factual prices, rates, codes,
administrative mappings, or weather values.

All factual results must come from validated internal data or approved providers.

---

# 8. SEO STRATEGY

SEO is a first-class architectural requirement.

It is not something to bolt on at the end.

Use Angular server-side/hybrid rendering.

Choose intelligently between:

* SSR;
* prerender/SSG;
* CSR.

Public indexable lookup pages should provide meaningful HTML without requiring browser JavaScript execution.

Interactive account/admin areas may use CSR where appropriate.

---

# 9. SEO URL TAXONOMY

Use structured URLs.

Examples:

```text
/vi/tra-cuu/dau-so/086
/vi/tra-cuu/ma-vung/0236
/vi/tra-cuu/bien-so/51k
/vi/tra-cuu/ma-buu-chinh/da-nang
/vi/tra-cuu/swift-code/vietcombank

/vi/cong-cu/tinh-tien-dien
/vi/cong-cu/lai-tiet-kiem
/vi/cong-cu/quy-doi-ngoai-te

/vi/hom-nay/gia-vang
/vi/hom-nay/ty-gia
/vi/hom-nay/gia-xang
/vi/hom-nay/thoi-tiet
```

English equivalents:

```text
/en/lookup/phone-prefix/086
/en/lookup/area-code/0236
...
```

Root `/` should resolve appropriately to Vietnamese without causing duplicate indexable content.

---

# 10. PROGRAMMATIC SEO RULES

Programmatic SEO must be quality-controlled.

Never generate meaningless combinations purely to create indexed URLs.

Each indexable page must:

* answer a real search intent;
* contain valid data;
* contain unique useful content;
* have a unique H1;
* have a meaningful title;
* have a meaningful meta description;
* have canonical URL;
* provide related navigation;
* provide breadcrumbs;
* display source where applicable;
* display updated/effective date where applicable;
* avoid keyword stuffing.

Pages without sufficient useful content must be:

* noindex;
* canonicalized;
* or not generated.

Do not create doorway pages.

---

# 11. ON-PAGE SEO

Implement:

* dynamic `<title>`;
* meta description;
* canonical;
* robots controls;
* Open Graph;
* Twitter metadata;
* H1/H2 hierarchy;
* semantic HTML;
* breadcrumb navigation;
* structured data;
* sitemap;
* sitemap index when necessary;
* robots.txt;
* alternate language URLs;
* hreflang;
* Vietnamese/English locale metadata.

Use meaningful internal linking.

---

# 12. STRUCTURED DATA

Implement only schema types that truthfully represent page content.

Potential schema types:

```text
WebSite
Organization
BreadcrumbList
FAQPage when legitimate FAQ content exists
WebPage
Dataset where appropriate
```

Never add fake ratings or unsupported structured data.

Structured data must match visible page content.

---

# 13. TECHNICAL SEO

Target excellent:

* crawlability;
* indexability;
* server response;
* LCP;
* CLS;
* INP;
* accessibility;
* mobile usability.

Avoid:

* render-blocking unnecessary JS;
* huge client bundles;
* hydration mismatch;
* layout shifts;
* excessive third-party scripts.

Images should use:

* explicit dimensions;
* responsive sizing;
* lazy loading where appropriate;
* modern formats.

Fonts must not unnecessarily block page rendering.

---

# 14. SEO CONTENT ENGINE

Create architecture for structured SEO content.

Do not manually hard-code hundreds of Angular pages.

A lookup landing page should be rendered from structured database records plus controlled templates.

Example:

```text
LookupPage
LookupEntity
SeoMetadata
LocalizedContent
RelatedEntity
SourceReference
```

Templates must produce natural language.

Vietnamese and English content must not be direct word-for-word translation when that sounds unnatural.

---

# 15. INTERNAL LINKING ENGINE

Generate useful internal relationships.

Example:

`/tra-cuu/bien-so/51k`

may link to:

```text
Mã vùng TP.HCM
Mã bưu chính TP.HCM
Thời tiết TP.HCM
Giá xăng hôm nay
```

Do not generate irrelevant SEO links.

---

# 16. FRONTEND TECHNOLOGY

Use:

```text
Angular
TypeScript
RxJS
HTML
SCSS
Angular SSR / hybrid rendering
```

Use the current stable Angular version at project initialization unless repository constraints require otherwise.

Avoid unnecessary UI framework dependency unless justified.

Prefer a custom design system built using Angular components and SCSS.

---

# 17. BACKEND TECHNOLOGY

Use:

```text
NestJS
TypeScript
PostgreSQL
Prisma
Redis
BullMQ
```

Expose documented REST APIs.

Use Swagger/OpenAPI.

Architecture should use modules and providers with clear boundaries.

---

# 18. MONOREPO STRUCTURE

Recommended structure:

```text
apps/
  web/
  api/

packages/
  shared/
  config/
  eslint-config/
  types/

docs/

infra/
```

If another structure is more suitable, document why before changing.

Keep frontend and backend independently buildable.

---

# 19. PROVIDER ARCHITECTURE

Never tightly couple business logic to third-party websites.

Use provider interfaces.

Examples:

```text
GoldPriceProvider
ExchangeRateProvider
InterestRateProvider
FuelPriceProvider
WeatherProvider
PostalCodeProvider
AdministrativeProvider
ElectricityTariffProvider
```

Implement normalized internal models.

Example architecture:

```text
External Source
      ↓
Provider Adapter
      ↓
Validation
      ↓
Normalization
      ↓
Database Snapshot
      ↓
Cache
      ↓
API
      ↓
Web
```

Provider failures must not crash the entire application.

Use:

* timeout;
* retries;
* backoff;
* circuit-breaker-like protections where appropriate;
* validation;
* structured logging.

---

# 20. DATA SOURCING RULES

Do not:

* bypass CAPTCHA;
* bypass authentication;
* circumvent rate limits;
* scrape aggressively;
* violate robots restrictions;
* impersonate official institutions;
* copy full articles;
* copy proprietary editorial content;
* copy protected graphics;
* copy another site's UI.

Prefer:

1. official API;
2. official published structured data;
3. properly licensed third-party API;
4. legal public dataset.

Document every provider.

Create:

```text
docs/data-sources.md
```

For each provider record:

```text
name
URL/domain
data type
retrieval method
update cadence
terms/licensing notes
fallback
last reviewed
```

---

# 21. DATABASE

Use PostgreSQL with Prisma.

Design normalized models for:

* sources;
* provider health;
* lookup entities;
* localized content;
* SEO metadata;
* telephone prefixes;
* area codes;
* vehicle plate prefixes;
* postal codes;
* administrative units;
* administrative mappings;
* banks;
* bank identifiers;
* gold products;
* gold snapshots;
* currency rates;
* rate snapshots;
* bank interest rates;
* fuel products;
* fuel price history;
* electricity tariff versions;
* electricity tariff tiers;
* weather cache when appropriate;
* jobs;
* alerts later;
* users later;
* favorites later.

Use proper indexes.

Use numeric types appropriate to Vietnamese currency.

Avoid floating-point arithmetic for money.

---

# 22. MONEY

Store Vietnamese currency using integer-safe types.

Never use JS floating-point arithmetic for authoritative VND values.

Use BigInt/Decimal where appropriate.

All APIs must serialize monetary data safely.

---

# 23. CACHE

Use Redis.

Do not call external providers on every user request.

Expected pattern:

```text
Provider
   ↓
Scheduled Worker
   ↓
Normalize
   ↓
PostgreSQL
   ↓
Redis cache
   ↓
API
```

Use per-domain TTL based on data volatility.

Example:

* weather: short;
* gold/exchange rates: short;
* postal code: long;
* phone prefixes: very long.

---

# 24. BACKGROUND JOBS

Use BullMQ for scheduled updates.

Requirements:

* idempotent jobs;
* concurrency control;
* retry;
* exponential backoff;
* structured logs;
* failure tracking;
* manual refresh for admin where appropriate.

Never allow two workers to corrupt the same snapshot.

---

# 25. ADMIN PORTAL

Build a secured admin section.

Admin features eventually include:

* dashboard;
* provider health;
* sync jobs;
* source management;
* lookup data management;
* SEO metadata;
* translation/content management;
* tariff management;
* data update logs;
* failed job inspection.

Do not expose admin features publicly.

Implement RBAC.

---

# 26. AUTHENTICATION

MVP public lookup does not require authentication.

Admin does.

For admin:

* secure password hashing;
* short-lived access token;
* refresh/session strategy;
* logout;
* rate limits;
* basic brute-force protection;
* audit-sensitive operations.

Future customer accounts must fit the same architecture.

---

# 27. UI DESIGN DIRECTION

Design must be modern but restrained.

Target visual characteristics:

* premium;
* clean;
* spacious;
* trustworthy;
* minimal;
* approachable;
* fast to scan.

Avoid:

* excessive gradients;
* excessive glass effects;
* tiny text;
* overloaded dashboards;
* too many colors;
* excessive borders;
* visual noise;
* animations that delay interaction.

Use generous white space.

Cards must have clear hierarchy.

The homepage search is the visual focus.

---

# 28. HOME PAGE

Suggested structure:

```text
HEADER

Logo
Tra cứu
Công cụ
Hôm nay
Language
Theme
Optional favorites later

HERO

TraNhanh
Cần biết gì, tra ngay.

[ Search input                                ] [ Tra cứu ]

Quick searches:
086 là mạng gì
51K ở đâu
Mã bưu chính Đà Nẵng
850 kWh bao nhiêu tiền
500 triệu gửi 12 tháng

LOOKUP CATEGORIES

Hành chính
Mã & định danh
Ngân hàng
Calculator

POPULAR LOOKUPS

Useful landing cards

TODAY

Gold
Exchange rates
Fuel
Weather

TOOLS

Electricity
Savings
Currency converter

SEO/CONTENT SECTION

Useful context without keyword stuffing

FOOTER
```

Do not make the homepage too long or overcrowded.

---

# 29. LIGHT AND DARK THEMES

Implement fully supported:

```text
Light
Dark
System
```

Default:

```text
System
```

or Light if product requirements later explicitly choose it.

Theme selection must persist locally.

Avoid theme flash during SSR/hydration.

Dark mode must be specifically designed, not automatically inverted.

All components must work in both themes.

Maintain sufficient contrast.

---

# 30. RESPONSIVE DESIGN

Support at minimum:

```text
320px mobile
375px mobile
390px mobile
430px mobile
tablet portrait
tablet landscape
small laptop
desktop
large desktop
```

No horizontal scrolling except intentionally scrollable content such as specific data tables.

Responsive behavior must be tested.

Navigation must work well on touch devices.

Touch targets should be comfortably sized.

---

# 31. ACCESSIBILITY

Target WCAG 2.2 AA where practical.

Implement:

* keyboard navigation;
* visible focus;
* semantic landmarks;
* form labels;
* ARIA only when necessary;
* proper heading hierarchy;
* sufficient contrast;
* reduced-motion consideration;
* accessible dialogs;
* accessible dropdowns;
* accessible mobile menu.

Do not rely only on color to communicate state.

---

# 32. I18N

Architect internationalization from the first phase.

Supported:

```text
vi
en
```

Default:

```text
vi
```

All UI copy must exist in both languages before completing a feature.

Localized URLs should be SEO-safe.

Implement:

* translated navigation;
* translated forms;
* translated validation;
* translated errors;
* translated metadata;
* translated content templates;
* localized number/date/currency formatting.

Use Vietnamese conventions for Vietnamese pages.

---

# 33. ERROR UX

Never show raw backend errors to normal users.

Provide clear localized states:

* loading;
* empty;
* unavailable;
* stale data;
* external source unavailable;
* validation error;
* not found;
* server error.

For stale data, where possible show the last successful timestamp.

---

# 34. ANALYTICS AND PRIVACY

Do not add invasive analytics by default.

If analytics is later added:

* use privacy-conscious configuration;
* document it;
* provide consent where legally required;
* avoid collecting unnecessary personal data.

Do not require account for public tools.

Do not collect exact geolocation unless user explicitly permits it.

---

# 35. SECURITY

Apply secure defaults.

Backend must include:

* DTO validation;
* sanitization where needed;
* rate limiting;
* Helmet/security headers where appropriate;
* CORS configuration;
* input limits;
* authentication guard;
* authorization guard;
* safe error handling;
* secret management;
* Prisma parameterized access;
* secure password hashing;
* SSR security considerations;
* external-provider URL allowlisting where necessary.

Never commit secrets.

---

# 36. CODE QUALITY

This repository uses:

```text
Angular
TypeScript
RxJS
HTML
SCSS
Prettier
ESLint
```

Mandatory formatting rules:

* Prettier `printWidth: 120`.
* ESLint maximum line length: 120.
* 2-space indentation.
* single quotes.
* semicolons.
* trailing commas where supported.

Automatically wrap anything over 120 characters.

Split long:

* imports;
* Angular decorators;
* constructor parameters;
* function parameters;
* function calls;
* arrays;
* objects;
* conditions;
* ternaries;
* RxJS pipes;
* method chains;
* HTML attributes.

When an Angular HTML element has multiple attributes/bindings, use one attribute per line.

Example:

```html
<button
  type="button"
  class="search-button"
  [disabled]="form.invalid"
  (click)="submitSearch()"
>
  Tra cứu
</button>
```

Do not leave formatting debt.

---

# 37. ANGULAR RULES

Use modern Angular patterns.

Prefer:

* standalone APIs where suitable;
* signals where they simplify state;
* RxJS for async streams where appropriate;
* typed reactive forms;
* lazy route loading;
* OnPush-like efficient rendering;
* reusable presentational components.

Avoid:

* enormous components;
* deeply nested subscriptions;
* manual subscription leaks;
* `any`;
* duplicated HTTP logic.

Use centralized API services and typed DTOs.

---

# 38. NESTJS RULES

Use modules with clear domain boundaries.

Expected pattern:

```text
Controller
Service
Repository/data access where useful
Provider adapter
DTO
Mapper
Domain type
Tests
```

Controllers must remain thin.

Third-party integrations must not live directly inside controllers.

---

# 39. API DESIGN

Use versioned API base:

```text
/api/v1
```

Use consistent envelopes/error shape where useful.

Implement:

* pagination;
* sorting;
* filtering;
* validation;
* reasonable limits.

Swagger must remain current.

---

# 40. TESTING

Every phase must include tests.

Backend:

* unit tests;
* integration tests;
* e2e for critical flows.

Frontend:

* unit/component tests;
* route behavior;
* forms;
* key SEO behavior where feasible.

Critical calculators must have deterministic tests.

Electricity calculations require boundary tests for every tariff tier.

Money calculations require exact expected values.

Unified search requires parser tests.

Provider normalization requires fixtures and tests.

---

# 41. E2E USER FLOWS

Eventually include end-to-end tests for at least:

```text
homepage
search
phone prefix lookup
area code lookup
vehicle plate lookup
postal code lookup
SWIFT lookup
electricity calculator
savings calculator
gold page
exchange rate page
language switching
theme switching
mobile navigation
404
admin authentication
```

---

# 42. PERFORMANCE TESTING

Track key production metrics.

Use Lighthouse or equivalent checks where appropriate.

Avoid blindly chasing a score while degrading UX, but target strong performance.

SEO landing pages should strive for excellent Core Web Vitals.

---

# 43. DOCKER

Provide production-oriented Docker setup.

Expected services:

```text
web
api
postgres
redis
```

Provide development Docker Compose where useful.

Production containers must:

* run non-root where practical;
* use multi-stage builds;
* avoid dev dependencies in final images;
* have health checks where applicable.

---

# 44. ENVIRONMENT CONFIGURATION

Provide:

```text
.env.example
```

Never store secrets.

Validate required environment variables during startup.

Separate:

* development;
* test;
* production.

---

# 45. CI

Use GitHub Actions.

CI should eventually run:

```text
install
format/check
lint
typecheck
unit tests
integration tests
production build
Prisma validation
migration checks where feasible
```

Do not push knowingly broken code.

---

# 46. GIT RULES

After every successfully completed phase:

1. ensure working tree contains only intentional changes;
2. run required tests;
3. run lint;
4. run formatting checks;
5. run production builds;
6. update progress documentation;
7. commit;
8. push to the configured remote branch.

Do not silently skip push.

If push is impossible because credentials/network/permissions are unavailable:

* preserve the local commit;
* document the exact reason in progress notes;
* do not pretend the push succeeded.

Use conventional commits.

Examples:

```text
chore: initialize project foundation
feat: add phone prefix lookup
feat: add electricity calculator
feat: add bilingual seo metadata
fix: correct vietnamese lookup copy
```

---

# 47. PROGRESS MEMORY FILE

Create:

```text
docs/PROJECT_PROGRESS.md
```

This file is mandatory.

It is the source of truth for future Codex sessions.

Every phase must update it BEFORE committing.

Structure:

```markdown
# TraNhanh Project Progress

## Current Status

Current phase:
Status:
Last updated:
Branch:
Latest commit:

## Completed Phases

### Phase X — Name

Status: Complete

Implemented:
- ...

Database:
- ...

API:
- ...

Frontend:
- ...

SEO:
- ...

Tests:
- ...

Validation:
- ...

Commit:
- ...

Known limitations:
- ...

## Current Architecture Decisions

- ...

## Active Data Providers

- ...

## Environment Notes

- ...

## Pending Work

### Next Phase
...

## Known Issues

- ...

## Do Not Reimplement

- ...
```

Never overwrite previous phase history.

Append/update it carefully.

A future Codex session must be able to continue by reading only:

```text
README.md
docs/PROJECT_PROGRESS.md
docs/architecture.md
docs/data-sources.md
```

plus the repository.

---

# 48. SESSION START PROCEDURE

At the beginning of EVERY new Codex session:

1. inspect repository;
2. read `docs/PROJECT_PROGRESS.md`;
3. read relevant architecture documentation;
4. inspect Git status;
5. inspect recent commits;
6. identify the next incomplete phase;
7. continue from there;
8. never rebuild completed functionality unnecessarily.

If progress notes conflict with repository state, repository/tests/git history win.

Correct the progress document.

---

# 49. USAGE-WINDOW STRATEGY

The user is working under a limited usage plan that refreshes approximately in multi-hour windows.

Treat each phase as one self-contained work package intended to fit comfortably within one normal working/usage window.

Do NOT optimize by skipping:

* tests;
* documentation;
* lint;
* builds;
* Git commit;
* Git push.

Instead reduce phase scope.

A phase must have one primary objective.

Do not start a large second objective near the end of a phase.

A clean checkpoint is more important than partially completing several features.

If a phase proves unexpectedly large, split it into:

```text
Phase X-A
Phase X-B
```

and document the split before continuing.

---

# 50. PHASE COMPLETION GATE

A phase is COMPLETE only when:

```text
implementation complete
+
migrations complete
+
tests pass
+
lint passes
+
format passes
+
production build passes
+
progress note updated
+
Git commit created
+
push succeeds, when remote access is available
```

If any mandatory item fails, phase remains:

```text
IN PROGRESS
```

Never mark a phase complete prematurely.

---

# 51. DO NOT ASK THE USER TO MANAGE ROUTINE IMPLEMENTATION

For normal technical decisions:

* inspect project;
* make the safest reasonable choice;
* document it;
* continue.

Only block on user input if absolutely necessary, such as:

* credentials;
* legal acceptance;
* paid provider decision;
* unavailable external account;
* destructive production action.

Do not repeatedly ask the user which library to use for routine engineering decisions.

---

# 52. ROADMAP

The following roadmap is intentionally split into focused phases.

Each phase should normally be completed independently.

---

# PHASE 0 — REPOSITORY AUDIT

Objective:

Determine whether this is a new or existing repository.

Tasks:

* inspect files;
* inspect Git;
* inspect remotes;
* inspect installed tools;
* detect existing code;
* do not overwrite existing work;
* create/update initial progress note.

Deliverable:

Repository assessment.

No unnecessary feature code.

---

# PHASE 1 — PROJECT FOUNDATION

Objective:

Create buildable monorepo foundation.

Implement:

* Angular web;
* Angular SSR/hybrid rendering;
* NestJS API;
* PostgreSQL;
* Prisma;
* Redis;
* BullMQ;
* shared types/config;
* ESLint;
* Prettier;
* Docker Compose;
* environment validation;
* health endpoint.

Create:

```text
README.md
docs/PROJECT_PROGRESS.md
docs/architecture.md
docs/data-sources.md
```

Acceptance:

Frontend and backend build.

---

# PHASE 2 — DESIGN SYSTEM

Objective:

Create the visual foundation.

Implement:

* typography;
* spacing;
* colors;
* cards;
* forms;
* buttons;
* icons;
* navigation;
* header;
* footer;
* empty/loading/error states;
* skeletons;
* responsive layout primitives.

Implement themes:

```text
light
dark
system
```

Acceptance:

Responsive design showcase page.

No business feature yet.

---

# PHASE 3 — I18N FOUNDATION

Objective:

Full bilingual architecture.

Implement:

```text
Vietnamese
English
```

Default Vietnamese.

Include:

* locale route strategy;
* number formats;
* currency formats;
* date formats;
* validation strings;
* navigation;
* theme labels;
* global errors.

Acceptance:

Language switch works correctly through SSR and browser navigation.

---

# PHASE 4 — SEO FOUNDATION

Objective:

Implement global technical SEO architecture.

Implement:

* SSR/SSG strategy;
* dynamic metadata service;
* canonical;
* hreflang;
* robots;
* sitemap architecture;
* breadcrumb component;
* structured data utilities;
* OpenGraph;
* localized metadata;
* 404 SEO behavior;
* noindex helpers.

Acceptance:

Rendered HTML contains correct metadata without browser JS.

---

# PHASE 5 — DATABASE CORE

Objective:

Create reusable lookup/content/source schemas.

Implement Prisma models for:

* source/provider;
* localized SEO metadata;
* lookup entities;
* source references;
* update timestamps;
* provider sync logs.

Add migration and seed framework.

---

# PHASE 6 — PHONE PREFIX LOOKUP BACKEND

Objective:

Implement telephone prefix domain.

Include:

* schema;
* seeds/import pipeline;
* lookup API;
* search;
* related prefixes;
* validation;
* tests.

Use reliable public data only.

---

# PHASE 7 — PHONE PREFIX FRONTEND + SEO

Objective:

Ship first complete SEO lookup vertical.

Pages:

```text
/vi/tra-cuu/dau-so
/vi/tra-cuu/dau-so/:prefix
```

English equivalent.

Example:

```text
086 là mạng gì?
```

Include:

* answer;
* source;
* updated date;
* related prefixes;
* FAQ if useful;
* SEO metadata;
* structured data;
* breadcrumbs.

---

# PHASE 8 — AREA CODE BACKEND

Objective:

Implement Vietnamese landline area codes.

Include:

* current code;
* locality;
* old code if relevant;
* data source;
* tests.

---

# PHASE 9 — AREA CODE FRONTEND + SEO

Implement landing/index pages.

Example:

```text
0236 là mã vùng ở đâu?
```

Include SEO/internal linking.

---

# PHASE 10 — VEHICLE PLATE BACKEND

Objective:

Vehicle plate prefix lookup.

Only use public non-personal mapping.

Never expose owner-identification functionality.

---

# PHASE 11 — VEHICLE PLATE FRONTEND + SEO

Example:

```text
51K là biển số ở đâu?
43 là biển số tỉnh nào?
```

Include regional related lookup links.

---

# PHASE 12 — POSTAL CODE BACKEND

Objective:

Implement postal code lookup with authoritative/reliable source tracking.

Support hierarchy only to the level justified by data accuracy.

---

# PHASE 13 — POSTAL CODE FRONTEND + SEO

Implement:

* search;
* region pages;
* specific pages;
* related locations;
* SEO metadata.

Avoid generating empty thin pages.

---

# PHASE 14 — BANK DIRECTORY BACKEND

Objective:

Implement bank entities and identifiers.

Include:

* bank name;
* aliases;
* SWIFT/BIC;
* bank code where available;
* official source link.

---

# PHASE 15 — BANK/SWIFT FRONTEND + SEO

Example:

```text
SWIFT code Vietcombank
SWIFT code Techcombank
```

Add bank-related internal linking.

---

# PHASE 16 — ADMINISTRATIVE DATA MODEL

Objective:

Build robust administrative-unit model.

Support effective dates and historical mapping.

Do not assume administrative boundaries never change.

---

# PHASE 17 — ADMINISTRATIVE IMPORT

Objective:

Import and validate official/reliable administrative data.

Support:

```text
old → new
new → previous
effective date
source
```

---

# PHASE 18 — ADMINISTRATIVE LOOKUP API

Objective:

Provide search/mapping API.

Support normalized Vietnamese search and aliases.

Tests must include diacritics/non-diacritics behavior.

---

# PHASE 19 — ADMINISTRATIVE FRONTEND + SEO

Example:

```text
Phường X sau sáp nhập thành gì?
```

Avoid making claims without source/effective date.

---

# PHASE 20 — HOMEPAGE V1

Objective:

Assemble production homepage.

Include:

* hero search;
* quick searches;
* lookup categories;
* popular lookup cards;
* tools preview;
* today's data placeholders only for features already available;
* footer.

Do not fake realtime data.

---

# PHASE 21 — UNIFIED SEARCH PARSER

Objective:

Implement deterministic query parser.

Supported initial intents:

```text
PHONE_PREFIX
AREA_CODE
VEHICLE_PLATE
POSTAL_CODE
ADMINISTRATIVE_LOOKUP
BANK_SWIFT
UNKNOWN
```

Test Vietnamese queries with and without accents.

---

# PHASE 22 — UNIFIED SEARCH UI

Objective:

Connect hero search to parser.

Implement:

* autocomplete;
* keyboard navigation;
* suggestions;
* recent local searches if privacy-safe;
* meaningful no-result UX.

---

# PHASE 23 — ELECTRICITY TARIFF MODEL

Objective:

Create versioned electricity tariff engine.

Database:

```text
TariffVersion
TariffTier
effectiveFrom
effectiveTo
VAT rules
source
```

---

# PHASE 24 — ELECTRICITY CALCULATOR BACKEND

Objective:

Exact electricity bill computation.

Requirements:

* deterministic;
* integer-safe;
* tariff-effective-date support;
* tier breakdown;
* tests for tier boundaries;
* VAT handling.

---

# PHASE 25 — ELECTRICITY CALCULATOR FRONTEND

Objective:

Beautiful calculator page.

Include:

* kWh input;
* tier breakdown;
* total;
* tariff reference;
* source;
* shareable URL/query state where SEO-safe.

---

# PHASE 26 — SAVINGS INTEREST MODEL + ENGINE

Objective:

Create savings calculation domain.

Support:

* principal;
* term;
* rate;
* estimate.

Avoid claims of guaranteed return.

---

# PHASE 27 — SAVINGS CALCULATOR FRONTEND

Objective:

Build savings calculator.

Include clear disclaimers.

---

# PHASE 28 — PROVIDER FRAMEWORK

Objective:

Build generic external-data provider framework.

Implement:

* adapter contract;
* timeout;
* retry;
* validation;
* normalization;
* provider health;
* sync logs;
* failure handling.

No realtime feature yet.

---

# PHASE 29 — GOLD PROVIDER

Objective:

Integrate one legally acceptable reliable gold data source.

Store snapshots.

Never scrape aggressively.

---

# PHASE 30 — GOLD API

Implement:

* current;
* product list;
* history;
* delta;
* provider/source;
* timestamp;
* caching.

---

# PHASE 31 — GOLD FRONTEND

Implement:

```text
/hom-nay/gia-vang
```

Include:

* cards;
* comparison;
* history chart;
* updated time;
* source.

Responsive and bilingual.

---

# PHASE 32 — EXCHANGE RATE PROVIDER

Objective:

Integrate reliable exchange-rate source(s).

Normalize currency/bank records.

---

# PHASE 33 — EXCHANGE RATE API

Implement:

* current rates;
* banks;
* currencies;
* comparison;
* history;
* calculator endpoint where useful.

---

# PHASE 34 — EXCHANGE RATE FRONTEND

Implement:

* currency selector;
* bank comparison;
* conversion;
* SEO landing pages.

---

# PHASE 35 — BANK INTEREST DATA

Objective:

Implement interest-rate providers/import process.

Store effective snapshots.

---

# PHASE 36 — BANK INTEREST FRONTEND

Implement:

* comparison;
* term selection;
* savings calculator integration;
* sources;
* timestamps.

---

# PHASE 37 — FUEL PRICE DATA

Objective:

Implement official/reliable fuel price history.

---

# PHASE 38 — FUEL FRONTEND

Implement current/historical fuel page.

---

# PHASE 39 — WEATHER PROVIDER

Objective:

Integrate legally permitted weather provider.

Use server-side caching.

Do not store exact user location unnecessarily.

---

# PHASE 40 — WEATHER FRONTEND

Implement:

* city lookup;
* hourly;
* daily;
* feels-like;
* humidity;
* rain;
* wind;
* UV/AQI where available.

Location permission must be explicit.

---

# PHASE 41 — HOMEPAGE V2 DAILY DATA

Objective:

Integrate:

* gold;
* exchange rate;
* fuel;
* weather.

Ensure homepage remains visually clean.

---

# PHASE 42 — SEARCH PARSER V2

Add intents:

```text
GOLD_PRICE
EXCHANGE_RATE
SAVINGS_INTEREST
ELECTRICITY_CALCULATOR
FUEL_PRICE
WEATHER
```

---

# PHASE 43 — RELATED CONTENT ENGINE

Objective:

Automated contextual internal linking.

Use entity relationships rather than keyword spam.

---

# PHASE 44 — PROGRAMMATIC SEO ENGINE

Objective:

Generate scalable quality-controlled landing pages.

Implement rules for:

```text
index
noindex
canonical
sitemap inclusion
minimum useful data
localized content
```

Do not mass-index thin pages.

---

# PHASE 45 — SITEMAP SYSTEM

Implement scalable sitemap generation.

Potential segmentation:

```text
sitemap-static.xml
sitemap-phone-prefix.xml
sitemap-area-code.xml
sitemap-vehicle-plate.xml
sitemap-postal-code.xml
sitemap-bank.xml
sitemap-admin.xml
sitemap-tools.xml
```

Create sitemap index.

---

# PHASE 46 — SEO QUALITY AUDIT

Audit:

* duplicate titles;
* duplicate descriptions;
* missing canonical;
* missing H1;
* broken hreflang;
* orphan pages;
* noindex mistakes;
* sitemap consistency;
* broken internal links;
* thin content.

Create automated validation where possible.

---

# PHASE 47 — ADMIN AUTH

Objective:

Secure admin login/session foundation.

---

# PHASE 48 — ADMIN SHELL

Objective:

Responsive admin portal.

Keep admin separate from public SEO page design.

---

# PHASE 49 — PROVIDER ADMIN

Manage/inspect:

* provider health;
* last sync;
* next sync;
* failures;
* manual refresh.

---

# PHASE 50 — SEO ADMIN

Allow safe editing of:

* metadata;
* controlled descriptions;
* translations;
* noindex override where appropriate.

Never allow arbitrary unsafe HTML by default.

---

# PHASE 51 — DATA ADMIN

Manage static lookup datasets through safe controlled workflows.

Include audit timestamps.

---

# PHASE 52 — OBSERVABILITY

Implement:

* structured logs;
* request correlation;
* worker logs;
* provider failures;
* basic metrics;
* health/readiness endpoints.

Avoid logging secrets or personal data.

---

# PHASE 53 — RATE LIMITING & HARDENING

Security hardening across:

* API;
* login;
* search;
* providers;
* admin.

---

# PHASE 54 — ACCESSIBILITY AUDIT

Perform full keyboard/mobile/accessibility review.

Fix findings.

---

# PHASE 55 — RESPONSIVE AUDIT

Explicitly test:

```text
320
375
390
430
768
1024
1280
1440+
```

Fix layout issues.

---

# PHASE 56 — DARK MODE AUDIT

Review every public/admin component in dark mode.

Fix:

* contrast;
* elevation;
* chart readability;
* icons;
* focus;
* forms;
* hover states.

---

# PHASE 57 — VIETNAMESE LANGUAGE QA

Review ALL Vietnamese UI/content.

Fix:

* grammar;
* spelling;
* unnatural wording;
* capitalization;
* units;
* punctuation;
* accents.

Vietnamese is the primary product language.

---

# PHASE 58 — ENGLISH LANGUAGE QA

Review all English content.

Do not accept literal/awkward translation.

---

# PHASE 59 — PERFORMANCE OPTIMIZATION

Audit:

* bundles;
* lazy routes;
* images;
* fonts;
* SSR;
* hydration;
* cache;
* API latency;
* database queries.

---

# PHASE 60 — CORE WEB VITALS AUDIT

Optimize public SEO landing pages.

Record before/after where feasible.

---

# PHASE 61 — FULL E2E SUITE

Complete production-critical E2E flows.

---

# PHASE 62 — CI HARDENING

Ensure CI reliably reproduces production checks.

---

# PHASE 63 — PRODUCTION DOCKER

Create final optimized production containers.

---

# PHASE 64 — DEPLOYMENT DOCUMENTATION

Document deployment for a practical production environment.

Include:

* DNS;
* HTTPS;
* reverse proxy/CDN;
* web;
* API;
* PostgreSQL;
* Redis;
* backups;
* environment variables;
* migrations;
* rollback.

Do not hardcode one commercial provider unless necessary.

---

# PHASE 65 — DATABASE BACKUP & RECOVERY

Document and test recovery procedure where feasible.

---

# PHASE 66 — LEGAL/POLICY PAGES

Implement:

```text
About
Contact
Privacy Policy
Terms
Data Sources
Disclaimer
```

Do not write false legal claims.

---

# PHASE 67 — SEO LAUNCH CHECKLIST

Validate:

```text
robots
sitemaps
canonical
hreflang
structured data
SSR output
404
redirects
performance
mobile
analytics if configured
Search Console readiness
```

---

# PHASE 68 — PRODUCTION READINESS REVIEW

Perform complete audit.

Produce:

```text
docs/PRODUCTION_READINESS.md
```

Include:

* completed areas;
* remaining risks;
* provider risks;
* security;
* SEO;
* performance;
* backups;
* deployment;
* legal/data-source concerns.

---

# PHASE 69 — FINAL CLEANUP

Objective:

No unnecessary TODOs.

No dead code.

No debug logs.

No unused dependencies.

No secrets.

No stale documentation.

Run all validation.

---

# PHASE 70 — V1 RELEASE

Create final V1 release state.

Required:

```text
all critical tests green
all production builds green
database migration verified
Docker verified
docs current
PROJECT_PROGRESS current
clean Git status
commit
push
release tag when appropriate
```

Document release in:

```text
docs/PROJECT_PROGRESS.md
```

---

# 53. FUTURE PHASES AFTER V1

Do not implement until V1 is stable unless explicitly requested.

Potential V2:

```text
User accounts
Favorites
Saved locations
Alerts
Telegram bot
Email notifications
Push notifications
Power outage schedules
AQI dedicated pages
UV pages
Lunar calendar
Holiday countdown
Workday calculator
Fuel trip calculator
Personalized morning dashboard
PWA
```

---

# 54. DEFINITION OF QUALITY

A feature is not finished because it “works on my machine”.

It must also be:

* tested;
* typed;
* formatted;
* responsive;
* accessible;
* translated;
* SEO-correct when public;
* secure;
* documented;
* maintainable;
* production-buildable.

---

# 55. IMPORTANT PRODUCT CONSTRAINTS

Never fabricate:

* financial data;
* official codes;
* administrative data;
* weather;
* prices;
* sources;
* update timestamps.

If reliable data is unavailable:

show a proper unavailable state.

Do not invent a fallback value.

---

# 56. SEO EXPECTATION

The business objective is strong organic Google traffic.

However:

Never claim guaranteed Google ranking.

Instead maximize the probability of ranking through:

* high-value search intent;
* technical SEO;
* server-rendered HTML;
* fast pages;
* accurate structured data;
* useful unique landing pages;
* strong internal linking;
* trustworthy sourcing;
* excellent mobile UX;
* correct multilingual SEO;
* avoiding spam.

Optimize primarily for users.

---

# 57. AFTER EVERY PHASE

Before declaring completion, provide a concise report in the session output containing:

```text
Phase:
Status:

Implemented:
Tests:
Build:
Database:
SEO:
Responsive:
i18n:
Git:
Commit:
Push:
Progress note:
Known issues:
Next phase:
```

Then immediately proceed according to project state if the user has instructed continuous execution.

Do not re-explain the whole roadmap each time.

---

# 58. CONTINUATION COMMAND

When receiving a future instruction such as:

```text
Continue
Làm tiếp
Tiếp tục phase sau
```

do not ask what to do.

Read:

```text
docs/PROJECT_PROGRESS.md
```

inspect Git and continue the next incomplete phase.

---

# 59. INITIAL EXECUTION

Start now.

First:

1. inspect the current repository;
2. inspect Git state and remote;
3. read any existing documentation;
4. determine whether Phase 0 is required;
5. execute the earliest incomplete phase;
6. run its completion gate;
7. update `docs/PROJECT_PROGRESS.md`;
8. commit;
9. push;
10. report results.

Do not attempt multiple major phases simultaneously.

Preserve a clean, resumable repository after every work window.
