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

1. Phase 13 — Authentication & User Foundation
2. Phase 14 — My Garage
3. Phase 15 — Traffic Fine Lookup Backend
4. Phase 16 — Traffic Fine Lookup Frontend + SEO
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

The old Postal Code Frontend + SEO phase is cancelled. Phase 13 starts authentication and does not gate public lookup.
