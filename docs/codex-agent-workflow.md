# Codex agent workflow

The project-local `tranhanh` workflow makes the parent Codex session an automatic, quota-aware coordinator for two custom agents:

| Role                 | Agent                | Model configuration                         | Use                                                                                |
| -------------------- | -------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------- |
| Reviewer and planner | `tranhanh-reviewer`  | Astra Light: `gpt-6-astra`, reasoning `low` | Read-only review, analysis, planning, risks, test plans, and implementation review |
| Developer            | `tranhanh-developer` | Luna Max: `gpt-5.6-luna`, reasoning `max`   | Implementation, tests, fixes, documentation, commits, and pushes                   |

The parent chooses one of three paths:

- Small/simple: `Luna -> focused test -> finalize`.
- Medium: `Luna -> optional Astra final review -> finalize` when risk warrants review.
- Major/high-risk: `Astra plan -> Luna implementation/self-review/final gate -> Astra final review -> optional Luna fix -> finalize`.

Major/high-risk work includes a new roadmap phase, architecture change, schema or migration, authentication/authorization, ownership or IDOR, private data, money correctness, provider/legal constraints, complex SSR or SEO architecture, queues/BullMQ, destructive migration, or difficult concurrency/transaction logic. Small work includes typo, copy/translation, docs-only, minor CSS/responsive, lint/test fixes, a simple null check, small refactor, dependency bump, or an obvious local bug. Medium work is a clear isolated feature, CRUD enhancement, API field, or component refactor without architectural or sensitive risk.

The parent sends file references and a small repository checkpoint, not full project documents or conversation transcripts. Astra planning reads only relevant areas and happens once for major/high-risk tasks. Luna implements the complete task in one session, runs focused checks, performs the required completion gate once, and self-reviews requirements, correctness, ownership/IDOR, privacy, migration safety, tests, lint, types, and regressions. Astra final review reads the actual diff, changed files, directly affected contracts/tests/migrations, and validation evidence without rereading the repository.

The normal maximum is two Astra calls per major/high-risk task and one Luna implementation call plus one optional fix continuation. A further Astra review is reserved for a critical/high-severity security, ownership, privacy, migration/data-loss, or unresolved correctness blocker. Style, formatting, wording, lint, test naming, and minor refactor preferences never trigger another review. Dependent work is sequential and parallel agents are avoided.

The definitions live in `.codex/agents/`; Codex loads them when this trusted project is opened. `AGENTS.md` supplies the parent-orchestration policy. Model routing is fixed: required planning and review use Astra Light, while implementation, testing, fixes, and Git use Luna Max. No silent substitution is allowed.

In a new Codex session opened at the repository root, invoke the full workflow with one instruction:

> Continue the next phase using the `tranhanh` workflow.

A specific task works the same way:

> Use the `tranhanh` workflow to fix <problem>.

The parent handles routing, handoffs, validation, documentation, commit, and push automatically. It reports the next roadmap phase without starting it. The current workflow optimization is documentation/configuration-only; it does not implement Phase 21.
