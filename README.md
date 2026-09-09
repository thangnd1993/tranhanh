# TraNhanh

Cần biết gì, tra ngay.

Vietnamese-first, bilingual lookup and daily utility platform. Repository audit is complete;
application implementation starts in Phase 1. There is no runnable application yet.

## Continue development

Read [project progress](docs/PROJECT_PROGRESS.md), [architecture](docs/architecture.md), and
[data sources](docs/data-sources.md), then inspect Git status and history before continuing.
The [master execution prompt](docs/MASTER_EXECUTION_PROMPT.md) preserves the original requirements.

Work on one focused phase at a time. Each implementation checkpoint requires tests, lint,
format checks, production builds, updated progress, a conventional commit, and a push when
a remote is available. Never commit secrets or fabricate factual data.

## Planned stack

Angular SSR, NestJS, PostgreSQL, Prisma, Redis, and BullMQ in a TypeScript monorepo.
Vietnamese is the default locale; English and light/dark/system themes are required.

## Local environment

Node 20.20.2, npm 10.8.2, pnpm 11.19.0, Corepack 0.34.6, Git, and Docker CLI 29.7.2
were detected during the audit. Docker's daemon is unavailable. Framework/runtime compatibility
must be checked before initialization. No Git remote is configured.
