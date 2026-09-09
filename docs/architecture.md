# Architecture

## Phase 0 decisions

This is a new repository with no existing code to migrate or preserve.
Use the requested layout when implementing Phase 1:

```text
apps/web/              Angular SSR/hybrid application
apps/api/              NestJS REST API
packages/shared/       Shared contracts
packages/config/       Shared configuration
packages/eslint-config/ Shared lint rules
packages/types/        Shared types where separately useful
docs/                  Project documentation
infra/                 Infrastructure configuration
```

Frontend and backend must build independently. Avoid creating empty packages without a purpose.
Select the current stable Angular version at initialization, verifying supported Node versions
against official documentation. No framework versions or dependencies are installed yet.

Public lookup routes require meaningful server-rendered HTML, localized metadata, and source
provenance. Vietnamese is the default locale with equivalent English routes.

Use PostgreSQL and Prisma for persisted data, Redis for domain-specific caching, and BullMQ
for idempotent background refresh. Providers validate and normalize data before storing snapshots;
requests must not trigger an external provider call on every visit.

Use integer-safe or decimal arithmetic for money and safe API serialization. Version tariffs
and administrative mappings by effective date. Display unavailable states when reliable data
does not exist. Never generate factual values using AI.

## Deferred implementation

Phase 1 introduces the buildable foundation, environment validation, health endpoint, Docker
Compose, and quality tooling. Later phases introduce the design system, localization, SEO,
domain schemas, and features in the order documented in the master execution prompt.
