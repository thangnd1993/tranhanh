# TraNhanh Codex workflow

The parent Codex session automatically routes the project-local `tranhanh` workflow. The user gives one task; the parent performs the handoffs, preserves the phase boundary, and reports the result. Never ask the user to invoke an agent, copy a plan, continue the workflow, run routine validation, fix review findings, commit, or push.

## Load project state

Before routing, read `docs/PROJECT_PROGRESS.md`, the relevant architecture, product-direction, and testing sections, current Git branch/status, and recent history when useful. Read files directly from the repository and pass references rather than copying large documents or transcripts. Do not load unrelated domains or repeat completed phases.

For roadmap work, take the requested phase from `docs/PROJECT_PROGRESS.md`, complete only that phase, and report the next phase without starting it.

## Quota-aware routing

Use the smallest workflow that preserves engineering quality. Keep the exact configured agents and models: `tranhanh-reviewer` uses `gpt-6-astra` with reasoning `low`; `tranhanh-developer` uses `gpt-5.6-luna` with reasoning `max`.

- **Small/simple:** Route directly to Luna only. This includes typo, copy or translation, docs-only, minor CSS/responsive work, lint or test fixes, a simple null check, a small refactor, a dependency bump, or an obvious local bug. Use `Luna -> focused test -> finalize`.
- **Medium:** Route to Luna for a clear isolated feature, CRUD enhancement, API field, or component refactor. Add one optional Astra final review only when meaningful correctness, regression, privacy, or security risk warrants it; skip Astra planning.
- **Major/high-risk:** Use `Astra plan -> Luna implementation/self-review/final gate -> Astra final review`. This is required for a new roadmap phase, architecture change, schema or migration, authentication/authorization, ownership or IDOR, private data, money correctness, provider/legal constraints, complex SSR or SEO architecture, queues/BullMQ, destructive migration, or difficult concurrency/transaction logic.

The normal maximum is two Astra calls per major/high-risk task (one plan and one final review) and one Luna implementation call plus one optional Luna fix continuation. A second Astra review beyond that is allowed only after a critical/high-severity security, ownership, privacy, migration/data-loss, or unresolved correctness blocker. Never spend another review call on style, formatting, wording, lint, test naming, or minor refactor preference. Dependent work is sequential; parallel agents are not used for quota savings.

## Orchestration

For major/high-risk work, the parent sends the original task, relevant repository checkpoint, phase boundary, and file references to one concise Astra planning call. It then sends the plan to one Luna implementation session. Luna implements the complete scope, runs focused checks, performs the required completion gate once, and self-reviews requirements, correctness, ownership/IDOR, privacy, migration safety, tests, lint, types, and regressions before handoff. The parent sends the actual diff, changed files, and validation evidence to one Astra final review.

For medium work, Luna follows the same focused validation and self-review rules; the parent adds the optional final review only when risk warrants it. Small work stays on the direct Luna path and uses task-appropriate focused validation.

If the final review returns `APPROVED`, Luna updates appropriate documentation, inspects the final diff, commits, pushes, and verifies synchronization when the parent assigns finalization. If it returns `CHANGES_REQUIRED`, the parent sends only actionable findings to Luna for one optional fix continuation. Luna reruns affected checks and the completion gate only when the fix could affect broader behavior. The parent requests another Astra review only for the serious blockers described above.

## Context, testing, and runtime

Astra reads only the project checkpoint, relevant architecture/domain files, directly affected contracts or migrations, and the actual Git diff. It does not reread the whole repository. Agents use focused tests during implementation and run the required full phase validation gate once at completion. They do not repeat full Angular, API, browser, migration, or runtime suites after each small edit.

Use one headless browser process/context where practical and representative viewport checks only when UI changes. Run Docker/PostgreSQL/Redis/BullMQ runtime verification once near completion only when the change affects schema, database behavior, queues, Redis, or runtime integration and the services are available. Do not mark a relevant working runtime check pending.

## Project rules

- Preserve the automotive-first Angular SSR, NestJS, Prisma/PostgreSQL, Redis/BullMQ, VI/EN, theme, SEO, authenticated Garage, and privacy boundaries documented in the repository.
- Follow Prettier, the 120-character print width, two-space indentation, single quotes, semicolons, supported trailing commas, strict TypeScript, and ESLint. Avoid unnecessary `any` and unrelated formatting.
- Do not force-push or rewrite existing history. Preserve remote work.
- Ask the user only for OS permission, missing credentials, a paid external service, destructive production work, a legal agreement, or a genuinely unresolved product decision.
