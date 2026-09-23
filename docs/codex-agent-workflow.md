# Main Codex Chat — single-session workflow

TraNhanh uses only the main Codex chat/session. It does not use reviewer, developer, planning or delegated subagents.

For each task, the main chat:

1. Inspects Git state, progress notes and only relevant documentation, source and tests.
2. Makes a concise internal plan for substantial work; small work skips unnecessary planning.
3. Implements directly, then self-reviews the actual diff for correctness, security, privacy, IDOR/ownership, data
   integrity, migrations, SSR leakage, SEO, regressions, performance and maintainability.
4. Runs focused tests while developing, then the required final validation once; runs runtime integration only when
   relevant and available.
5. Updates documentation, commits, pushes normally and verifies a clean synchronized branch.

This keeps context and quota use low: no duplicated handoffs, parallel agents or separate review passes. Project rules,
roadmap boundaries, exact-money handling, owner scoping, public/private separation, SSR/SEO and testing requirements stay
unchanged.

In a new session, use either:

> Continue the next phase using the tranhanh workflow.

or a specific task such as:

> Use the tranhanh workflow to fix <problem>.

The main Codex chat handles the work directly. A dry-run of either instruction inspects and plans only when explicitly
requested as a dry-run; it does not start a product phase.
