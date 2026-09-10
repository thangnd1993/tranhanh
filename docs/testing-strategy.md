# Testing strategy

This permanent workflow applies to every subsequent development session.
The objective is maximum useful validation with minimum CPU/RAM usage.

## Quality gates and scope

Prefer automated unit, component, API, and headless E2E tests, SSR smoke tests, static DOM/HTML assertions,
accessibility assertions, and automated responsive checks. Run checks sequentially where practical and avoid
competing browser/build processes on the limited-resource development machine.

This policy does not waive tests, lint, formatting, production builds, SSR validation, accessibility validation,
or responsive validation when relevant. Optimize execution, not coverage of required gates.
For documentation-only work, review the diff, check modified-document formatting and links, confirm no application
behavior changed, and verify clean Git synchronization after commit. Do not run a browser visual audit.

## Browser lifecycle

- Headless mode is the default. Use a visible browser only when visual debugging requires it.
- Prefer one browser process, reuse one context where safe, and reuse one page/tab where practical.
  Isolate state only when test correctness requires it.
- Run viewport checks sequentially. Do not launch a visible browser per viewport or routinely open many windows/tabs.
- Close pages, contexts, and the browser immediately after testing, including on failures via cleanup/finally blocks.
- Terminate leftover test-owned Chromium/Chrome processes after the run; preserve unrelated user browser sessions.
- Do not leave automated browser windows open after validation.

## Selective visual QA

UI phases still require meaningful visual QA: automated tests, headless validation, and a small number of
representative screenshots. Inspect screenshots when public UI materially changes, a major page is introduced,
responsive layout or themes change, automated checks indicate a possible visual problem, or a phase requires a visual audit.
Check overflow, clipping, broken layouts, spacing, typography, themes, rendering regressions, and visual hierarchy.

Validate all required breakpoints automatically. Normally inspect screenshots at:

- 390px — mobile.
- 768px — tablet, when relevant.
- 1440px — desktop.

Add widths only to investigate a specific responsive problem. The dedicated responsive audit phase may use a broader
visual matrix. Do not perform exhaustive screenshot review for backend, database, infrastructure, provider integration
without UI changes, or documentation-only phases.

Backend/data/database/provider phases normally require zero visible browser windows and no browser testing;
use browser testing only if user-visible frontend behavior changes.

## Temporary artifacts

Store routine screenshots in temporary storage and remove them after validation. Do not commit routine visual output.
Retain screenshots only when intentionally required as a documented reference, test fixture, or regression artifact
specifically meant to be version-controlled. Keep temporary browser profiles and test resources out of the repository.
