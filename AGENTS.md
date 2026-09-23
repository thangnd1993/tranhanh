# TraNhanh Codex workflow

TraNhanh uses the main Codex chat/session only. Do not spawn, route to, or hand off work to subagents, reviewers,
developers, Astra, Luna, or any delegated agent.

## Start every task

Inspect the repository directly: `git status`, `git branch -vv`, recent Git history,
`docs/PROJECT_PROGRESS.md`, and only the relevant architecture, product, source, implementation and test files.
Repository state, Git and project documentation are the source of truth; do not rely on prior chat memory.

## Main-session workflow

For a roadmap phase or other substantial/security-sensitive work, make a concise internal plan covering affected domains,
implementation steps, migration or data risks, ownership/IDOR and privacy risks, tests and relevant runtime verification.
Then implement directly in this session, self-review the actual diff, run focused tests during development and the required
final validation once near completion. Do not ask the user to approve routine plans or implementation steps.

For a small task, inspect, edit, run focused validation, self-review, document when needed, commit and push without
unnecessary planning overhead.

Before finalizing, directly review correctness, security, privacy, ownership/IDOR, data integrity, migration safety,
SSR/private-data leakage, SEO, regressions, performance and maintainability. Fix issues found in this self-review.

Run Docker/PostgreSQL/Redis/BullMQ integration only when the change affects those systems and they are available. Reuse a
headless browser process where practical for UI work; do not repeat broad suites after every small edit.

## Project rules

- Preserve the automotive-first Angular SSR, NestJS, Prisma/PostgreSQL, Redis/BullMQ, VI/EN, theme, SEO,
  authenticated Garage and privacy boundaries documented in the repository.
- Keep private entities owner-scoped, enforce safe IDOR behavior and prevent private data from entering SSR,
  TransferState, public SEO, sitemaps, structured data, browser persistence or routine logs.
- Follow Prettier, the 120-character print width, two-space indentation, single quotes, semicolons, supported trailing
  commas, strict TypeScript and ESLint. Avoid unnecessary `any` and unrelated formatting.
- Do not force-push or rewrite history. Preserve remote work.

## Documentation and Git

Update relevant project documentation automatically, including `docs/PROJECT_PROGRESS.md`, `docs/architecture.md`,
`docs/product-direction.md`, `docs/data-sources.md`, `docs/testing-strategy.md` and `README.md` when applicable.

When work is complete: inspect the final diff, verify required checks, update documentation, commit, push normally to
`origin/main`, confirm the working tree is clean and local `HEAD` equals `origin/main`. Do not ask routine questions about
editing, testing, migrations, documentation, committing or pushing. Ask only for OS permission, missing credentials, a
paid external service, destructive production work, a legal agreement or a genuine unresolved product decision.
