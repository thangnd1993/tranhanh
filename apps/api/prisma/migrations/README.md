# Database migrations

`20260911000000_add_core_data_foundation` is the first additive migration: seven core tables, three enums,
unique/query indexes, and audit-preserving foreign keys. No business data is seeded.

Generated using Prisma 7.10 `migrate diff --from-empty --to-schema prisma/schema.prisma --script`.
Reviewed CHECK additions enforce stable lowercase kebab keys, nonnegative counts, sync completion timestamps,
valid half-open effective intervals, and locale-matching normalized canonical paths. Prisma schema syntax does
not represent these CHECK constraints; review and retain them when creating later migrations.
UUID defaults and updatedAt are Prisma-client managed, so raw SQL writers must supply both explicitly.

The SQL has no DROP/TRUNCATE, destructive data updates, or cascading deletes. It has not yet been executed
against PostgreSQL because Docker is unavailable. Prisma validation/generation is not runtime migration proof.

Use `pnpm db:migrate:deploy` against a confirmed local development database. Use `pnpm test:database` with an
explicit local `TEST_DATABASE_URL` for the isolated `tranhanh_test` database; the runner applies migrations before
the integration suite. Never use reset to repair an unknown database. Never edit a migration after deployment;
write a subsequent migration instead. See the repository README for commands and runtime verification.
