# krizaka-ui-builder — agent contract

<!-- krizaka-agents-template v2: rendered from krizaka/.github docs/standards/agents-template.md (scripts/agents-md.mjs). The one AGENTS.md standard: six sections in this order, at most 150 lines, bullets and imperatives. The conformance check « agents-template » reads the headings, the length and CLAUDE.md. Detail goes to docs/ via References, not here. -->

## Project context

- Shared visual page editor: the Krizaka fork of Puck (`@krizaka/ui-builder`, `packages/core`).
- Kind: `npm` · team: `krizaka` · registry entry: [repos.json](https://github.com/krizaka/.github/blob/main/repos.json).
- Read this file first, then the section of [docs/agents.md](docs/agents.md) for what you touch.
- `CLAUDE.md` is the one line `@AGENTS.md` (or a symlink to this file): never a second copy of it.
- No product code here: the shop catalogue and its block config live in their own repositories.
- Publishing is the changesets release workflow only (`.github/workflows/release.yml`); upstream's publish workflows were removed.

## Essential commands

```bash
pnpm format
pnpm lint
pnpm test
pnpm build
```

- `pnpm e2e` runs the editor task cost journey (Playwright); run `pnpm build` first and `pnpm exec playwright install chromium` once.
- `UPDATE_REFERENCE=1 pnpm e2e` records a lowered cost in `e2e/editor-task-cost.reference.json`; a higher number is a regression, not an update.
- `pnpm changeset` adds the release note of a change to the published package.
- Run them on what you changed before every push; CI runs the rest.

## Architecture & conventions

- Follow the [krizaka-engineering skill](https://github.com/krizaka/krizaka-skills/blob/main/skills/krizaka-engineering/SKILL.md); search its [packages reference](https://github.com/krizaka/krizaka-skills/blob/main/skills/krizaka-engineering/references/packages.md) before writing anything generic.
- Take libraries first: a size check, a date sum, a money format, a fetch, a retry, a rate limit, a validation regex come from `@krizaka/*`; a missing function goes into the package first, never a local copy.
- Keep ports and adapters: domain code reads no env, no ambient clock, no database client; services talk to ports; route handlers are thin (authenticate, parse, one service call, map the result).
- Write one job per function: cognitive complexity ≤ 15, nesting ≤ 2, a body under 60 lines; a form saves once; the same block twice is a function, in two repositories a package function.
- Put limits, prices, durations and flags in settings an administrator changes, not in constants.
- A closed set is a type (`as const` object, Java enum or sealed interface), never strings compared by hand.
- Name things by what they do (`media-store.ts`, never `postgres.ts`); no `utils`, `helpers`, `manager`.
- Type errors with a stable code, mapped to HTTP once; user messages come from the catalogues.
- Keep the canvas, drag and drop and the outline close to upstream so their fixes still apply; change them only with a reason in the pull request.
- Editor words live in `lib/dictionary.ts` (English) and `lib/dictionary-fr.ts` (every key; a test keeps the two in step).
- Block operations (move, add, duplicate, remove) go through `lib/block-actions.ts`; the same operations on a stored document are in `document/operations.ts`.
- Hierarchy: this root file holds the rules of the whole repository; a sub-folder with its own rules adds a local `AGENTS.md` that says only what differs there. The nearest file wins.

## Guard-rails & known pitfalls (read before coding)

- The checks are the judge ([ADR-015](https://github.com/krizaka/krizaka-internal/blob/main/docs/adr/.github/ADR-015-ai-code-audit-measured-and-enforced.md), [guards](https://github.com/krizaka/.github/blob/main/docs/standards/guards.md)): never `--no-verify`, never a new `eslint-disable`, never a raised ratchet or baseline (`sonar-ratchet.json`); a rule is never silenced to get green.
- Start a fix with a failing test; every bug gets its guard; the journey (end to end) proves the feature.
- Never open a pull request against `puckeditor/puck` by accident: `gh` in a fork defaults to the parent, so always pass `--repo krizaka/krizaka-ui-builder` (the org's `pr-open` does).
- Upstream security and bug fixes are cherry-picked, one pull request each, the upstream commit in the title (`fix(core): <what> (cherry-pick puckeditor/puck@<sha>)`), within a week of an upstream release; features come in only when an issue asks for one.
- Send generic fixes (editor i18n hooks, accessibility, field-type hooks) upstream to `puckeditor/puck`, linked from their krizaka-internal issue; never propose our schema, words or skin.
- The editor task cost test fails when an action or Tab-stop count grows, when a task that worked can no longer be done, or when a new level A or B command is under 44 px on the phone or 32 px on the desk, or above 60 % of the screen height on the phone.
- Do not make a drag the only way to add or move a block: keep the buttons, the block bar and Alt+↑ / Alt+↓; a drag is for a fine pointer only.
- Keep one `primary` action (Publish) in the header, and each bar (header, bottom bar `Nav`, selected-block bar) one WAI-ARIA toolbar through `lib/use-roving-toolbar.ts`: one Tab stop per bar.
- Keep fork divergence small: `Drawer`, `DraggableComponent`, `layer` / `layer-actions`, `use-sensors`, the `history` slice (Undo flushes a change still waiting for its debounce).
- Never invent a URL, a law article, a price or a figure you did not read; write `TO VALIDATE` and say who decides.
- Never commit a secret, a capture or a log; no production data in a session, only the dev data.

## Expected validation workflow

- [ ] Compile, format, lint and test what changed (the commands above); fix the cause of a red, never the guard.
- [ ] After a UI change, `pnpm build` then `pnpm e2e`; record a lowered cost, never a raised one.
- [ ] The « before you push » checklist of the skill holds for what changed.
- [ ] A feature or fix PR names its journey (`Journey: <name>` or `Journey: n/a — <reason>`).
- [ ] README and generated docs still say what the code does.
- [ ] One issue, one small PR (`Closes #<n>`); merge only with green CI.

## References

- [docs/agents.md](docs/agents.md): this repository's own detail (upstream policy, editor task cost, toolbars, blocks without dragging, plan), read by section.
- [Org standards](https://github.com/krizaka/.github/tree/main/docs/standards) of krizaka/.github; the [engineering charter](https://github.com/krizaka/.github/blob/main/AGENTS.template.md) (naming, tests, mobile, coding agents).
- [krizaka-engineering skill](https://github.com/krizaka/krizaka-skills/blob/main/skills/krizaka-engineering/SKILL.md).
