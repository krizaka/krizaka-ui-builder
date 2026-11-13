# Krizaka UI Builder

[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=krizaka_krizaka-ui-builder&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=krizaka_krizaka-ui-builder) [![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=krizaka_krizaka-ui-builder&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=krizaka_krizaka-ui-builder) [![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=krizaka_krizaka-ui-builder&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=krizaka_krizaka-ui-builder) [![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=krizaka_krizaka-ui-builder&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=krizaka_krizaka-ui-builder) [![Coverage](https://sonarcloud.io/api/project_badges/measure?project=krizaka_krizaka-ui-builder&metric=coverage)](https://sonarcloud.io/summary/new_code?id=krizaka_krizaka-ui-builder)

The visual page editor of the Krizaka family: **the Krizaka fork of [Puck](https://github.com/puckeditor/puck)** (MIT),
published on npm as [`@krizaka/ui-builder`](https://www.npmjs.com/package/@krizaka/ui-builder). It keeps Puck's canvas,
drag and drop, outline and phone layout, and adds a versioned document validated with zod, nested blocks, content per
locale, variables and bindings. What is done is under « Today », what is not is under « Planned » with its ticket.

```bash
npm install @krizaka/ui-builder
```

[![npm](https://img.shields.io/npm/v/@krizaka/ui-builder)](https://www.npmjs.com/package/@krizaka/ui-builder) The badge
shows the version published now.

|              |                                                                                                                                                                   |
| :----------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package      | `@krizaka/ui-builder` on npm (MIT), released with changesets and npm provenance; the editor is `packages/core`.                                                   |
| Document     | `@krizaka/ui-builder/document`: the versioned `ComposerDocument` (schema 2), validated with zod, no React, runs on a server.                                      |
| Upstream     | Puck 0.24.0 (MIT, `puckeditor/puck`), tracked as the `upstream` remote: security and bug fixes are cherry-picked, generic fixes are proposed back from this fork. |
| Licence      | MIT. Puck's [LICENSE](LICENSE) is kept unchanged; see [NOTICE](NOTICE).                                                                                           |
| Try it       | The editor in your browser, nothing saved: [ui.krizaka.com/builder](https://ui.krizaka.com/builder).                                                              |
| Used by      | [Folioviv](https://github.com/krizaka/folioviv)'s shop editor (Boutique › Page).                                                                                  |
| Contributing | [AGENTS.md](AGENTS.md) and [docs/agents.md](docs/agents.md); the org's standards in [krizaka/.github](https://github.com/krizaka/.github).                        |

## Today

What the package does now:

- **Document**: the versioned, zod-validated `ComposerDocument` below, with content per locale (`{ en, fr }` words in a
  document), variables and bindings.
- **Editor**: Puck's editor as of 0.24.0, in English. Puck's `dictionary` prop lets a host replace any editor string;
  no translation ships with the package.
- **Keyboard**: native buttons and keyboard equivalents (Enter, Space, Escape) for the click handlers on containers, the
  modal backdrop and array items, and Puck's Delete and Backspace hotkeys.
- **Removed from the fork**: see the end of « The document ».

## Planned

Not done yet; each line has its ticket (private tracker of the Krizaka team).

- **French editor**: editor words in French and English through `@krizaka/i18n`
  ([#1897](https://github.com/krizaka/krizaka-internal/issues/1897)).
- **Krizaka tokens and `@krizaka/ui` controls** in the editor, with a keyboard and accessibility pass
  ([#1905](https://github.com/krizaka/krizaka-internal/issues/1905)).
- **A React-free page contract** with typed operations
  ([#2261](https://github.com/krizaka/krizaka-internal/issues/2261)).

## The document

A page is JSON: `{ schema: 2, locales, defaultLocale, root: { props }, blocks }`. A block is `{ id, type, props, slots }`;
`slots` hold nested blocks. A prop is text, a number, a boolean, a list of options, words per locale (`{ en, fr }`), a
variable (`{ var }`) or a binding (`{ bind }`) the host resolves, or an asset in the host's storage (`{ asset, poster? }`).
There is no markup and no code in a document: text holding a tag or a script address, an event-handler or `style` prop,
and `__proto__` keys are refused.

```ts
import {
  defineBlocks,
  validateDocument,
  readDocument,
} from "@krizaka/ui-builder/document";

const registry = defineBlocks({
  blocks: {
    model: {
      fields: {
        src: {
          type: "asset",
          accept: ["model/gltf-binary"],
          poster: { accept: ["image/*"] },
        },
      },
    },
  },
});

// On a server, before storing: every issue with its path and a stable code, never a throw.
const result = validateDocument(body, {
  registry,
  assets: { mimeOf: (id) => storage.mimeOf(id) },
});
// An older stored document (the shop page, schema 1) is read once: migrate, then parse.
const stored = readDocument(row.document);
```

Field types are closed: `text`, `localized`, `enum`, `number` (min, max, step, unit), `boolean`, `asset` (MIME allow-list)
and `slot` (allowed types, count, depth). Versions are migrated by pure functions (`migrateDocument`); a newer document
than the code knows is refused. Puck's saved data is read once with `fromPuckData` and never written.

Dropped from the upstream fork: rich text (TipTap), external fields, `create-puck-app`, the Contentful and emotion
plugins, the heading analyzer, the demo and docs apps and the recipes.

<!-- krizaka:workflows:start -->

## Workflows

What runs in the Actions tab of this repository.

- **CI** (`ci.yml`): Lint, tests and build of the repository. Runs on push, on every pull request, in the merge queue.
- **Dependabot auto-merge** (`dependabot-automerge.yml`): Auto-merges safe Dependabot updates. Runs on every pull request.
- **Merge resolution** (`merge-resolution.yml`): Fails a PR that drops what main added without a deletion-explained line. Runs on every pull request.
- **Release notes** (`release-notes.yml`): Writes the release notes. Runs on push.
- **Release** (`release.yml`): Versions and publishes the packages (Changesets). Runs on push, on demand.
- **Scorecard** (`scorecard.yml`): OpenSSF Scorecard of the repository. Runs when branch rules change, on a schedule, on demand.
- **Security scan** (`security.yml`): Secret scan (gitleaks) and workflow scan (zizmor); both are required checks. Runs on every pull request, in the merge queue, on push.

<!-- krizaka:workflows:end -->
