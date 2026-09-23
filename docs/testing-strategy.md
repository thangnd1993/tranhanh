# Testing strategy

This permanent workflow applies to every subsequent development session.
The objective is maximum useful validation with minimum CPU/RAM usage.

## Quality gates and scope

Prefer automated unit, component, API, and headless E2E tests, SSR smoke tests, static DOM/HTML assertions,
accessibility assertions, and automated responsive checks. Run checks sequentially where practical and avoid
competing browser/build processes on the limited-resource development machine.

This policy does not waive tests, lint, formatting, production builds, SSR validation, accessibility validation,
or responsive validation when relevant. Optimize execution, not coverage of required gates.
For documentation-only work, review the diff, check modified-document formatting and links, confirm no application
behavior changed, and verify clean Git synchronization after commit. Do not run a browser visual audit.

## Browser lifecycle

- Headless mode is the default. Use a visible browser only when visual debugging requires it.
- Prefer one browser process, reuse one context where safe, and reuse one page/tab where practical.
  Isolate state only when test correctness requires it.
- Run viewport checks sequentially. Do not launch a visible browser per viewport or routinely open many windows/tabs.
- Close pages, contexts, and the browser immediately after testing, including on failures via cleanup/finally blocks.
- Terminate leftover test-owned Chromium/Chrome processes after the run; preserve unrelated user browser sessions.
- Do not leave automated browser windows open after validation.

## Selective visual QA

UI phases still require meaningful visual QA: automated tests, headless validation, and a small number of
representative screenshots. Inspect screenshots when public UI materially changes, a major page is introduced,
responsive layout or themes change, automated checks indicate a possible visual problem, or a phase requires a visual audit.
Check overflow, clipping, broken layouts, spacing, typography, themes, rendering regressions, and visual hierarchy.

Validate all required breakpoints automatically. Normally inspect screenshots at:

- 390px — mobile.
- 768px — tablet, when relevant.
- 1440px — desktop.

Add widths only to investigate a specific responsive problem. The dedicated responsive audit phase may use a broader
visual matrix. Do not perform exhaustive screenshot review for backend, database, infrastructure, provider integration
without UI changes, or documentation-only phases.

Backend/data/database/provider phases normally require zero visible browser windows and no browser testing;
use browser testing only if user-visible frontend behavior changes.

## Temporary artifacts

Store routine screenshots in temporary storage and remove them after validation. Do not commit routine visual output.
Retain screenshots only when intentionally required as a documented reference, test fixture, or regression artifact
specifically meant to be version-controlled. Keep temporary browser profiles and test resources out of the repository.

## Permanent execution policy — minimize questions, act autonomously

For normal engineering work, inspect the repository, choose the safest reasonable implementation, document material
choices, and continue without confirmation. Work already required by the current phase is authorized: edit files,
fix lint or test failures, run required validation, update relevant documentation, commit, and push. Do not ask whether
to continue, modify a file, run tests, update notes, commit, push, or take the next routine step.

Resolve routine Angular, NestJS, Prisma, DTO, validation, error-handling, caching, naming, file organization, SCSS,
responsive, and test choices using existing conventions, the specification, maintainability, security, performance,
and simplicity. Ask about preferences only when the decision materially changes the product or authorized scope.
Prefer existing dependencies/platform APIs. Add a necessary maintained open-source dependency without routine approval
when its license is acceptable and its runtime/bundle impact is modest; document important additions. Ask if it requires
a paid service, external account, telemetry, a licensing decision, or major architectural lock-in.

Ask only when human input is required for:

- Missing credentials/authentication that cannot be resolved from the environment.
- A third-party account, paid API, subscription, billing action, or legal agreement.
- Destructive work with irreversible data-loss risk.
- Production deployment or production database mutation requiring explicit approval.
- Security-sensitive authorization or exposing, deleting, rotating, or replacing secrets.
- Genuinely conflicting product requirements that project documentation cannot resolve.
- Required OS, browser, filesystem, GitHub, or tool access approval.
- Meaningful remote Git changes that cannot safely be reconciled automatically.
- An undefined business/product decision that materially changes scope.

Tool-enforced permissions remain mandatory. Request only the exact blocked access with one short reason, without
unrelated confirmation questions. Continue automatically once access is available. Investigate technical failures,
try reasonable safe fixes/alternatives, retry, and document unresolved blockers; optional failures should not halt
independent required work. Ask only when the remaining blocker requires a person.

Run phase-required validation automatically using the low-resource workflow above. Update PROJECT_PROGRESS.md,
architecture.md, data-sources.md, and README automatically when relevant. After a successfully validated phase, inspect
the diff, update progress notes, commit, push to origin/main, verify local/remote HEAD and Git status, and report the
result. Preserve remote work; never force push without an explicit later instruction.

When the user says “continue”, “làm tiếp”, “phase tiếp theo”, or provides a phase specification, start the authorized
work immediately without routine reconfirmation or repeating the roadmap. This policy does not authorize unrelated
scope expansion or waive required system permissions.

## Phase 20 Fuel Log gates

Fuel Log calculation tests cover empty, partial, full-tank, multi-partial, zero-distance, edits, archive/restore, open intervals, weighted averages, Vietnam month boundaries and historical backfill. PostgreSQL runtime tests cover DECIMAL/BIGINT persistence, transaction chronology, vehicle odometer updates, lifecycle and the complete two-user IDOR matrix. Angular tests cover localized routes plus honest empty and insufficient-data states. Full workspace regressions, SSR/browser build, private-data leakage, responsive widths, light/dark themes, migration review and Compose health remain required before the phase checkpoint.

## Phase 21 Maintenance gates

Maintenance calculator tests cover Vietnam date boundaries, the 30-day/1,000-km due-soon windows, either-threshold due,
unknown mileage, exact zero versus unknown cost, and plan lifecycle semantics. Service/API tests must cover composite owner
and vehicle scoping, archived-vehicle mutation blocking, monotonic odometer backfill, transactional completion rollback,
unique linked history and retry idempotency. PostgreSQL checks cover DATE, nullable BIGINT, non-negative bounds, required
plan threshold, lifecycle consistency, composite foreign keys and cascades. Angular tests cover bilingual route mapping,
neutral SSR/browser-only fetch, empty/loading/error/retry states, due indicators, confirmation actions and 320–1440px
overflow in light and dark themes. The full workspace, migration, SSR leakage/sitemap and relevant Fuel Log/Documents/Fuel
Prices regression gates remain required at the phase checkpoint; no notification or new queue test is expected. The API
E2E configuration sets `NODE_ENV=test` before importing `AppModule`, so background BullMQ workers are not started by
HTTP-only tests and their Redis teardown is deterministic.

## Phase 22 Vehicle Expense gates

Expense service/unit tests cover integer-string VND bounds (including exact zero and values above JavaScript's safe
integer range), invalid decimals/negative/null values, BigInt totals, raw DATE mapping, owner scoping and archived-vehicle
mutation guards. Real PostgreSQL fixtures cover Vietnam year/month and instant-vs-DATE boundaries, mixed-source summary
and deterministic tie pagination, null versus zero maintenance, source edits/archive/restore, and no mirrored duplicates;
the focused Phase 22 PostgreSQL run passes 9/9. Guarded public lookup fixtures select occupied-key-free candidates from
the designated test database without modifying existing reviewed rows. API E2E tests cover authentication, trusted
Origin, CSRF, two-user ownership, wrong-vehicle 404s and manual-only categories; lifecycle calls use a service double,
not persisted PostgreSQL state. Angular tests currently cover bilingual route mapping, neutral SSR/browser-only fetch and
empty state, plus date-only formatting under a negative UTC offset. Error/retry, filter/page reset, source-link/archive
confirmation interactions and screenshot review remain manual/Playwright-pending. The required Node 24.15.0 workspace,
API E2E, full PostgreSQL (102/102), Redis/BullMQ runtime (10/10), migration, SSR/SEO and focused Chrome 153 CDP gates
have passed; broad Playwright interaction coverage remains pending until that package is restored. Run the full
workspace gate once, then migration/database/runtime/SSR/sitemap regressions relevant to private Garage behavior; this
completed gate is the evidence for the Phase 22 implementation handoff.

## Phase 23 Driver Dashboard gates

The dashboard service fixture suite covers primary selection, deterministic fallback, exact month/fuel composition,
document attention, maintenance due/due-soon and unknown mileage, manual-only monitoring, no-active Garage state and safe
404 selection behavior. The API E2E suite covers invalid UUID/month validation, two authenticated users, foreign and
archived selection 404s, unauthenticated rejection, and private no-store/no-referrer/noindex headers. Angular tests cover
VI/EN dashboard route mapping, browser-only auth fetch behavior, and stale selector-response race protection; the full web
suite passes 78/78. The focused dashboard UI suite passes 4/4, the API dashboard unit suite 6/6, and dashboard E2E suite
3/3. Shared, API and production browser/SSR builds pass; the existing homepage component-style budget warning remains. A temporary Chrome 153 CDP fallback smoke authenticated a mock owner, hydrated the dashboard, switched to the backup vehicle, checked private SSR metadata and found no horizontal overflow at 320/390/768/1440px. Four temporary screenshots were generated and dimension-checked for review; Playwright remains unavailable.

The implementation adds no schema or provider and therefore requires no migration/import/queue gate. The normal full
workspace gate remains the handoff gate; when the configured PostgreSQL/Redis test services are available, run the existing
Database and runtime suites as regression evidence for owner scoping and Phase 20–22 calculator semantics. Browser review
should use one authenticated Chrome/CDP session with 320/390/768/1440px light/dark checks and temporary screenshots,
without persisting dashboard values in TransferState or storage. Phase 24 is the Notification Center.
