# TraNhanh Codex workflow

Use the repository as the source of truth. At the start of every task, inspect `docs/PROJECT_PROGRESS.md`, the current Git branch and status, recent history, and the relevant architecture, product-direction, and testing documents. Never rely on prior chat memory or repeat a completed phase unnecessarily.

## `tranhanh` workflow

Treat the two project agents as one sequential workflow:

1. Spawn `tranhanh-reviewer` to analyze a substantial request and return a concise implementation plan.
2. Give that plan and the necessary repository context to `tranhanh-developer` for implementation and validation.
3. Spawn `tranhanh-reviewer` again to inspect the resulting diff and validation evidence.
4. If the review contains a real defect, return the findings to `tranhanh-developer`, have it fix them, and run final relevant validation.
5. After a clean review, complete required progress documentation, commit, push, and verify synchronization under the existing Git policy.

Use at most the normal sequence `plan -> develop -> review -> fix if needed -> final validation`. Repeat only when a blocking defect remains. Keep write-capable work sequential to avoid conflicts.

Route review, analysis, planning, risk, migration, source/data, SEO, security/privacy, test-plan, and implementation-review work to `tranhanh-reviewer`. Route coding, refactoring, file edits, Angular, NestJS, Prisma, migrations, tests, CSS/HTML, APIs, databases, Docker/runtime work, validation fixes, commits, and pushes to `tranhanh-developer`.

For a small, clearly read-only request, use only `tranhanh-reviewer`. For a small implementation with an already approved concrete plan, the developer may start directly. Never ask routine confirmation questions; follow the permanent autonomy policy in `docs/PROJECT_PROGRESS.md` and `docs/testing-strategy.md`.

## Project rules

- Preserve the automotive-first Angular SSR, NestJS, Prisma/PostgreSQL, Redis/BullMQ, VI/EN, theme, SEO, authenticated Garage, and privacy boundaries documented in the repository.
- Follow Prettier, the 120-character print width, two-space indentation, single quotes, semicolons, supported trailing commas, strict TypeScript, and ESLint. Avoid unnecessary `any` and unrelated formatting.
- Follow `docs/testing-strategy.md`; use focused checks during development and the required completion gate at task completion.
- Never force-push or rewrite existing history. Preserve remote work.
- Ask the user only for OS permission, missing credentials, a paid external service, destructive production work, a legal agreement, or a genuinely unresolved product decision.
