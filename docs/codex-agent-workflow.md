# Codex agent workflow

The project-local `tranhanh` workflow uses two custom agents while presenting one repeatable process:

| Role                 | Agent                | Model configuration                         | Use                                                                                |
| -------------------- | -------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------- |
| Reviewer and planner | `tranhanh-reviewer`  | Astra Light: `gpt-6-astra`, reasoning `low` | Read-only review, analysis, planning, risks, test plans, and implementation review |
| Developer            | `tranhanh-developer` | Luna Max: `gpt-5.6-luna`, reasoning `max`   | Implementation, tests, fixes, documentation, commits, and pushes                   |

The normal handoff is `plan -> develop -> review -> fix if needed -> final validation`. The reviewer reads the current repository state and creates a bounded plan. The developer receives that plan, implements it, and runs validation from `docs/testing-strategy.md`. The reviewer then checks the diff and evidence. One developer fix pass follows when real defects exist; another loop is reserved for a remaining blocker.

Both agents begin from `docs/PROJECT_PROGRESS.md`, current branch/status, recent Git history, and relevant project documents. They do not depend on previous conversation memory. The developer follows the project's autonomous-execution and Git policies and does not request routine confirmations.

The definitions live in `.codex/agents/`; Codex loads them when this trusted project is opened. `AGENTS.md` supplies the project-level routing and handoff instructions. In a new Codex session opened at the repository root, invoke it with:

> Use the `tranhanh` workflow for this task: <task>. Have `tranhanh-reviewer` plan, `tranhanh-developer` implement and validate, then `tranhanh-reviewer` review the result.

For read-only work, ask Codex to use `tranhanh-reviewer` alone. For a concrete plan already approved by the user, ask it to start with `tranhanh-developer` and retain the final reviewer pass.
