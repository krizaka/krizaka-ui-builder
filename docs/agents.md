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
- This repository has no demo app: the journey runs against the live `/fr/builder` page of the Krizaka UI site
  (`BUILDER_BASE_URL`, `BUILDER_PATH` to point at another host), so it measures the published editor and the host page.
- After a change that lowers a cost, record it: `UPDATE_REFERENCE=1 pnpm e2e`. A higher number is a regression, not an update.

## Plan (krizaka-internal#1889)

1. C0 — the fork set up (this state): CI on the org's reusable workflows, protection, registry. Nothing published.
2. C1 (this state) — `packages/core` is `@krizaka/ui-builder`; the `ComposerDocument` schema in `/document`; the drops; first npm release by changesets (`.github/workflows/release.yml`).
3. C2 — the editor's words in French and English (`@krizaka/i18n`).
4. C3 — ergonomics: Krizaka tokens, `@krizaka/ui` controls, keyboard, accessibility.

## Not here

- Publishing is the changesets release workflow only (provenance, trusted publishing); upstream's publish workflows were removed.
- No product code: the shop catalogue and its block config live in their own repositories.
