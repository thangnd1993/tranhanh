# Automotive Product Direction

## Vision and audience

TraNhanh is a temporary working label for a Vietnamese-first digital assistant for drivers, vehicle owners, families
managing one or more vehicles, and people researching vehicle and traffic information. The web product combines public,
source-transparent acquisition tools with optional private features that create recurring value. The permanent brand and
domain remain undecided.

## Principles

- Automotive first: new roadmap work must benefit drivers, vehicle owners, or automotive information users.
- Public first: public tools remain account-free, SSR-rendered, mobile-first, fast, source-transparent, and indexable when
  appropriate.
- Optional account: identity unlocks saved vehicles, monitoring, reminders, logs, expenses, and a personal dashboard.
- Privacy by design: private vehicle records are owner-scoped and excluded from public SEO and routine telemetry.
- Source transparency: automotive facts retain publisher, provider, retrieval/update time, and effective dates.
- Web first: Angular SSR remains the client; contracts and domain boundaries stay suitable for later native clients.

## Existing feature disposition

| Feature                         | Disposition       | Decision                                                                                                             |
| ------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| Vehicle Plate Lookup            | Keep, first-class | Primary public automotive acquisition feature; preserve API, UI, SSR, SEO, privacy rules, and sitemap.               |
| Platform and design foundations | Keep              | Retain Angular/NestJS, data and queue infrastructure, shared contracts, design system, i18n, SEO, tests, and builds. |
| Source/provider infrastructure  | Keep              | Reuse DataSource, DataProvider, SyncRun, and SourceReference for sourced automotive facts.                           |
| Phone Prefix Lookup             | De-emphasize      | Preserve valid routes, functionality, and indexing; expose only as a secondary utility and stop roadmap expansion.   |
| Area Code Lookup                | De-emphasize      | Preserve valid routes, functionality, and indexing; stop unrelated expansion.                                        |
| Postal Code Backend             | Dormant           | Preserve schema, migration, dataset, validation, API, tests, and provenance; cancel its frontend and SEO phase.      |

No completed feature is removed in this pivot. Removal can be considered later only with usage, SEO, migration, and
operational evidence.

## Public and private product

Public product areas include Vehicle Plate Lookup, future one-time Traffic Fine Lookup, Fuel Prices, Traffic Rules and
Fines, and Vehicle Tools. Private product areas include My Garage, saved vehicles, monitoring, documents, reminders, fuel
logs, maintenance, expenses, notification history, and a personalized dashboard. Public reference entities and private
owner records remain distinct even when a private workflow consumes a public fact.

## Roadmap

Completed history remains Phases 0–12. Phase 12P records this pivot. The active sequence is:

1. Phase 13 — Authentication & User Foundation (complete locally; runtime database verification pending)
2. Phase 14 — My Garage (complete locally; runtime database verification pending)
3. Phase 15 — Traffic Fine Lookup Backend (complete; lawful manual-provider foundation)
4. Phase 16 — Traffic Fine Lookup Frontend + SEO (complete)
5. Phase 17 — Vehicle Monitoring
6. Phase 18 — Registration, Insurance & Vehicle Documents
7. Phase 19 — Fuel Prices
8. Phase 20 — Fuel Log
9. Phase 21 — Maintenance
10. Phase 22 — Vehicle Expenses
11. Phase 23 — Driver Dashboard
12. Phase 24 — Notification Center
13. Phase 25 — Vehicle Tools
14. Phase 26 — Traffic Rules & Fine Reference
15. Phase 27 — PWA & Web Push
16. Phase 28 — Reliability, Privacy & Security Hardening
17. Phase 29 — SEO & Acquisition Expansion
18. Phase 30 — Native Mobile Readiness

The old Postal Code Frontend + SEO phase is cancelled. Phase 13 added optional authentication without gating public lookup. Phase 14 added My Garage with owner-scoped vehicles. Phase 15 added a public, privacy-aware Traffic Fine Lookup backend and truthful manual verification through the official CSGT page. Phase 16 added the bilingual public frontend, official manual-verification flow, static SEO pages, sitemap entries, and first-class homepage/navigation placement. Phase 17 adds opt-in monitoring for saved vehicles.

## Vehicle monitoring — Phase 17

A signed-in user can save a traffic-fine monitoring preference for any active vehicle. The product distinguishes a saved
preference from operational automation. With the current official CSGT source, the visible state is “automatic monitoring
unavailable” because a person must complete CAPTCHA; TraNhanh stores the preference and links to the manual lookup without
claiming it is checking in the background.

Future automated activation requires a reviewed provider contract, capability and rate limits, plus a fresh explicit user
action. Archived vehicles stop scheduling and restore does not silently reactivate them. Monitoring history and results are
private account data and never become public lookup, SEO, sitemap or structured-data content. Notification delivery remains
Phase 24.

## Vehicle documents and reminders — Phase 18

A signed-in user can keep registration, inspection, insurance, road-use-fee, and other document metadata with a saved
vehicle. This is a private organizer and expiry reminder center. It does not present entries as verified, query a registry,
upload scans, or infer compliance. Vietnam calendar dates distinguish expired, expiring-soon, valid, and no-expiry states.

Reminder preferences support 30, 15, 7, and 1 day before expiry. Phase 18 persists internal events with stale-job and
duplicate protection. Delivery channels remain Phase 24. Private routes stay out of acquisition pages, sitemaps, structured
data, browser storage, and server-rendered user content.

## Fuel prices — Phase 19

Fuel Prices is a first-class account-free public tool. It presents the Ministry of Industry and Trade's current applicable
**maximum retail prices**, not station-specific offers or real-time prices. The page keeps E5RON92, E10RON95-III, diesel
0.05S and mazut 180CST 3.5S separate, including the liter/kilogram distinction, previous-period comparison, recent history,
effective time and source publication. A reviewed manual import is preferred to an undocumented scraper. Fuel logging,
station search, forecasts and personal fuel preferences remain outside this phase; Phase 20 owns private Fuel Log work.

## Phase 20 - Fuel Log

Fuel Log is a private recurring-use vehicle feature. Owners record refueling time, integer odometer, exact liters, exact total VND, optional fuel label, full-tank flag, station and notes. Monthly spending and volume count every active fill. Economy and cost/km appear only for mathematically complete full-tank intervals; the product never renders zero as a substitute for unavailable data.

Fuel entries remain the authoritative fuel-expense records for Phase 22. Phase 20 does not add general expenses, maintenance, station data, route tracking, receipt OCR or automatic transaction pricing from the public Fuel Prices feature. Account deletion will cascade private fuel history through the existing user/vehicle ownership lifecycle.

## Phase 21 - Maintenance

Maintenance is a bounded private organizer for owner-entered service history and upcoming plans. History records keep a
Vietnam service date, title/category, optional odometer and exact total VND cost, distinguishing unknown cost from zero;
workshop and notes are optional. Owners can edit, archive and restore history. Active history is the authoritative
maintenance-cost source reserved for Phase 22, so this phase adds no general expense rows.

Plans contain a title and at least one user-defined due date or odometer threshold. Either threshold reached is due; the UI
also marks a plan due soon within 30 calendar days or 1,000 km. A missing current odometer is shown explicitly as unknown
mileage. Plans can be completed, archived and restored. Completion atomically creates/links exactly one history record and
never lowers the vehicle odometer; retries return the existing completion. Archived vehicles remain readable but block new or
active maintenance operations. Manufacturer advice, recurring generation, notifications, workshop booking, attachments and
public/SEO maintenance pages remain outside this phase.

## Phase 22 — Vehicle Expenses

Vehicle Expenses is a private per-vehicle ledger. Active Fuel Log costs and active Maintenance History known costs are
read dynamically from their authoritative records; the product never mirrors or backfills them. Manual entries are
limited to insurance, registration, toll, parking and other costs. Public fuel prices, documents, fines, plans, reminders
and other reference records do not create expense rows.

Money is a required integer VND string from 0 through 9999999999999999 and is stored as PostgreSQL `BIGINT`; zero is an
exact known cost. The month selector uses the Vietnam calendar. Fuel entries use the Asia/Ho_Chi_Minh half-open instant
boundary while DATE sources use direct month bounds. Unknown maintenance costs stay null, and summaries distinguish
known totals from incomplete data. Expense entries are private, owner-scoped, archiveable, and excluded from public SEO,
browser storage, notifications, recurring rules, receipts/OCR, refunds, currencies, budgets and dashboard work.

## Phase 23 — Driver Dashboard

The Driver Dashboard is a private, read-only account overview at `/vi/tong-quan` and `/en/dashboard`. It is
vehicle-first: the active primary is selected by default, with a deterministic active fallback, and the selector exposes
only active vehicle identity needed for navigation. The view shows active count, authoritative current odometer, document
expiry attention, maintenance due/due-soon/unknown-mileage counts, the selected vehicle’s Vietnam-month expense and fuel
summaries, monitoring capability/effective state/last timestamps, and links back to Garage features. A user with no active
vehicle receives a clear Garage add-vehicle state. No account-wide financial aggregate is exposed.

`GET /api/v1/vehicles/dashboard` validates an optional UUID vehicle selection and a `YYYY-MM` month before deriving
all reads from the authenticated owner. Foreign, missing and archived selections return one safe 404. Existing document,
maintenance, fuel, monitoring and VehicleExpense calculators remain authoritative; exact VND strings, null unknown costs,
Vietnam date/month boundaries and explicit missing-mileage/fuel availability codes are preserved. Cards are independently
read and carry one presence/refresh timestamp rather than claiming an atomic account snapshot.

This phase adds no schema, migration, provider, cache, queue, scheduler, notification or write behavior. Private API and
SSR/browser routes are no-store/no-referrer/noindex, browser-fetched after auth, and excluded from TransferState, storage,
JSON-LD and sitemaps. Phase 24 remains the Notification Center, where delivery policy—not dashboard aggregation—belongs.
