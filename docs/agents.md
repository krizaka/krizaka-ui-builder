# krizaka-ui-builder (Krizaka UI Builder) in detail

The Krizaka fork of Puck (folioviv ADR-010, amended 2026-10-31). Read this before touching the code.

## Upstream

- Remote `upstream` = `https://github.com/puckeditor/puck`; we started from the commit named in [NOTICE](../NOTICE).
- **Security and bug fixes** of upstream are cherry-picked, one pull request each, the upstream commit in the title
  (`fix(core): <what> (cherry-pick puckeditor/puck@<sha>)`), within a week of an upstream release.
- **Features** come in only when an issue asks for one.
- **Generic fixes go back upstream** (editor i18n hooks, accessibility, field-type hooks): a branch from this fork,
  a pull request to `puckeditor/puck`, linked from its krizaka-internal issue. Our schema, words and skin are not
  proposed upstream.
- Keep the canvas, drag and drop and the outline close to upstream so their fixes still apply; change them only with a
  reason in the pull request.
- Never open a pull request against `puckeditor/puck` by accident: `gh` in a fork defaults to the parent, so always pass
  `--repo krizaka/krizaka-ui-builder` (the org's `pr-open` does).

## Editor task cost (krizaka-internal#3544)

`e2e/editor-task-cost.spec.ts` plays five editor tasks (add, move, remove, undo, change the content language) at 1440 x 900
and at 360 x 780, with the pointer and with the keyboard. For each it records the gestures, the Tab stops from the top of the
page, and the size and height on the screen (share of the screen height) of every command it uses. The numbers live in
`e2e/editor-task-cost.reference.json`; the test fails when an action count or a Tab-stop count grows, when a task that
worked can no longer be done (`null` means "cannot be done"), or when a new level A or B command is under 44 px on the phone or
32 px on the desk. Today's commands that are already under the floor are in the reference: fixing one only lowers the bar.

- Run it: `pnpm exec playwright install chromium`, then `pnpm e2e`. CI: `.github/workflows/editor-task-cost.yml`.
- The journey runs against the editor built from THIS branch: `e2e/host` is a small host page (French/English, nine blocks,
  a content-language switch) bundled by `e2e/host/serve.mjs` against `packages/core/dist`, so run `pnpm build` first (CI does).
  Set `BUILDER_BASE_URL` (and `BUILDER_PATH`) to measure another host instead, such as the live `/fr/builder` page.
- Without dragging (krizaka-internal#3545): the journey adds with the « Add » button of a block-list row, moves with the block
  bar's Move up or the outline's Alt+↑ / Alt+↓, and an Undo only counts when the removed block is back. A drag is for a fine
  pointer only (`lib/dnd/fine-pointer.ts`).
- On a phone (#3546): under 638 px Undo is a bottom-bar item (`Layout`, next to the panels) and the selected block's
  floating bar (`Puck/components/SelectedBlockBar`, 44 px targets, tokens only) sits above it. The test also fails when a level
  A or B command of the editor sits above 60 % of the screen height on the phone (`outOfReach`; the host's own content-language
  switch is exempt). The bar added Tab stops (#3546); #3547 puts each bar in one toolbar and brings them down (phone/keyboard: move 23 -> 15, undo 7 -> 2).
- After a change that lowers a cost, record it: `UPDATE_REFERENCE=1 pnpm e2e`. A higher number is a regression, not an update.

## The header and the toolbars (krizaka-internal#3547)

- The header holds the content language: the `contentLanguage` prop of `Puck` (`{ value, options, onChange }`) renders a
  `SegmentedControl` (pressed buttons) in the header's tools. Undo and Redo are 40 px (`IconButton size="large"`), with a
  tooltip and `aria-keyshortcuts` from `lib/history-shortcut.ts`. The header has one `primary` action (Publish): a test keeps it so.
- The header, the bottom bar (`Nav`) and the floating selected-block bar are each one WAI-ARIA toolbar through
  `lib/use-roving-toolbar.ts`: one Tab stop per bar (roving tabindex), arrows, Home and End inside it. It finds the buttons
  in the DOM, so a host's header action joins the bar; a disabled or hidden button is skipped.
- The journey counts Tab presses as `tabStops` and the arrow presses that reach the command as `arrowKeys` (not in `actions`).
  On a phone an open panel covers the header, so changing the content language costs the panel tab's tap first (1 -> 2 actions).

## Moving, adding and removing blocks without dragging (krizaka-internal#3545)

- The block bar (Move up, Move down, Add after, Duplicate, Remove, Parent block), the outline row menu and Alt+↑ / Alt+↓,
  and the « Add » button of each block-list row all call `lib/block-actions.ts`, which dispatches the reducer actions (the
  drag's own door). The same operations on a stored document are in `document/operations.ts` (`removeBlock`, `moveBlock`,
  `duplicateBlock`, krizaka-internal#3449): pure, typed refusals, the caller gives the id of a copy.
- The editor's words: `lib/dictionary.ts` (English) and `lib/dictionary-fr.ts` (`dictionaryFr`, every key; a test keeps the
  two in step). A host passes `dictionary={dictionaryFr}`.
- Fork divergence, kept small: `Drawer` (an `onAdd` button), `DraggableComponent` (the bar's buttons, bottom-anchored so a
  taller bar never covers the block's first line), `layer` / `layer-actions` (row keys and menu), `use-sensors` (fine pointer
  only), `history` slice (Undo flushes a change that is still waiting for its debounce, so Undo right after Remove works).

## Plan (krizaka-internal#1889)

1. C0 — the fork set up (this state): CI on the org's reusable workflows, protection, registry. Nothing published.
2. C1 (this state) — `packages/core` is `@krizaka/ui-builder`; the `ComposerDocument` schema in `/document`; the drops; first npm release by changesets (`.github/workflows/release.yml`).
3. C2 — the editor's words in French and English (`@krizaka/i18n`).
4. C3 — ergonomics: Krizaka tokens, `@krizaka/ui` controls, keyboard, accessibility.

## Not here

- Publishing is the changesets release workflow only (provenance, trusted publishing); upstream's publish workflows were removed.
- No product code: the shop catalogue and its block config live in their own repositories.
