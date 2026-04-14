# Leaftab Grid

Desktop-style shortcut grid engine and React adapters extracted from [LeafTab](https://github.com/mason173/LeafTab).

Leaftab Grid is the open-source interaction layer behind LeafTab's shortcut surface. It focuses on behaviors that typical sortable grids usually do not cover well:

- true root-grid reorder
- merge two shortcuts into a folder
- move a shortcut into an existing folder
- reorder inside a folder surface
- drag a folder child back into the root grid
- span-aware placement for larger folder tiles

Current release stage: `0.1.x alpha`

## Live Links

- GitHub Pages showcase: [mason173.github.io/leaftab-grid](https://mason173.github.io/leaftab-grid/)
- Repository: [github.com/mason173/leaftab-grid](https://github.com/mason173/leaftab-grid)
- Behavior contract: [docs/compact-grid-rules.md](./docs/compact-grid-rules.md)
- Concepts guide: [docs/shortcut-grid-concepts.md](./docs/shortcut-grid-concepts.md)
- Comparison guide: [docs/shortcut-grid-comparison.md](./docs/shortcut-grid-comparison.md)
- Quick start: [docs/quick-start.md](./docs/quick-start.md)
- Release process: [docs/release-process.md](./docs/release-process.md)
- Execution plan: [docs/leaftab-grid-execution-plan.md](./docs/leaftab-grid-execution-plan.md)
- LeafTab preset alignment checklist: [docs/leaftab-preset-alignment-checklist.md](./docs/leaftab-preset-alignment-checklist.md)
- Sync guide: [docs/leaftab-grid-sync-guide.md](./docs/leaftab-grid-sync-guide.md)
- LeafTab-like integration guide: [docs/leaftab-like-host-guide.md](./docs/leaftab-like-host-guide.md)
- Plugin convergence plan: [docs/plugin-convergence-plan.md](./docs/plugin-convergence-plan.md)
- Pages deployment guide: [docs/github-pages-showcase.md](./docs/github-pages-showcase.md)

## LeafTab Origin

Leaftab Grid was extracted from the production shortcut system inside LeafTab, the browser new-tab extension where these interactions were originally designed and refined.

LeafTab links:

- LeafTab repository: [github.com/mason173/LeafTab](https://github.com/mason173/LeafTab)
- Chrome Web Store: [LeafTab on Chrome Web Store](https://chromewebstore.google.com/detail/leaftab/lfogogokkkpmolbfbklchcbgdiboccdf?hl=zh-CN&gl=DE)
- Edge Add-ons: [LeafTab on Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/leaftab/nfbdmggppgfmfbaddobdhdleppgffphn)
- Firefox Add-ons: [LeafTab on Firefox Add-ons](https://addons.mozilla.org/zh-CN/firefox/addon/leaftab/)

## What This Repo Is

This repository publishes the reusable grid system, not the entire LeafTab product shell.

It gives you:

- a pure shortcut-tree and drag behavior layer
- a React adapter layer for root-grid and folder-surface interactions
- tests for the core behavior model
- a public behavior spec
- a close-to-LeafTab reference example for host integration
- a custom-theme example proving the engine can support a very different host look
- a showcase host app that demonstrates the open-source packages directly

It does not currently give you the full LeafTab product preset out of the box.

That means this repo does not try to publish every LeafTab-specific detail as a stable public API, including:

- LeafTab's exact card renderer
- LeafTab's exact folder preview visuals
- LeafTab's complete icon customization strategy
- LeafTab app flows such as dialogs, persistence, toasts, sync, and extension policy

If you want the interaction model, this repo is the source of truth.

If you want a 1:1 LeafTab look and feel, you still need a host layer that matches LeafTab's layout inputs, target-region math, and visual rendering.

## Why It Exists

Many drag-and-drop libraries are intentionally generic. Many grid libraries are intentionally dashboard-oriented. Leaftab Grid is different: it is focused on shortcut surfaces that behave more like a desktop launcher or browser start page.

This repo exists to make that behavior reusable outside the LeafTab app itself.

## Packages

### `@leaftab/grid-core`

Pure layout, drag, and domain logic.

This package owns:

- shortcut tree selectors and operations
- drag-session math
- packed grid layout logic
- root drop-intent resolution
- folder-aware mutation outcomes

### `@leaftab/grid-react`

React adapters for the root grid, folder surface, and shared drag-motion lifecycle.

This package owns:

- `RootShortcutGrid`
- `FolderShortcutSurface`
- shared preview geometry and motion helpers
- injected render hooks for host-specific visuals

### `@leaftab/grid-preset-leaftab`

LeafTab-like host preset for apps that want to get much closer to the real LeafTab feel without rebuilding every host-side metric and renderer from scratch.

This package currently starts with:

- compact grid metrics
- large-folder sizing rules
- compact target-region helpers
- drop-target resolver helpers
- a bundled root-grid preset helper for LeafTab-like hosts
- a bundled folder-surface preset helper for LeafTab-like hosts
- LeafTab-like card and folder preview renderers

## What The Public Contract Covers

The first public contract focuses on:

- root shortcut grids
- folder-aware drag and drop
- one folder child level
- pure layout and drag logic
- React adapters for production-style interactions

Current non-goals:

- nested folder interactions
- app-specific dialogs and persistence flows
- unrelated LeafTab page UI
- a fully packaged "LeafTab clone" preset

## Can It Match LeafTab?

Yes, but not automatically.

The open-source packages expose the shared behavior engine and the host integration hooks. To reach a result that feels close to LeafTab, the host app still needs to supply:

- the same compact layout metrics
- the same large-folder sizing rules
- the same target-region and drop-preview geometry
- the same card and folder-preview rendering style
- a simple icon presentation that fits the host, if exact LeafTab icon behavior is not a goal

For the detailed path, see [docs/leaftab-like-host-guide.md](./docs/leaftab-like-host-guide.md).

If your goal is eventual convergence with the real LeafTab app instead of building an unrelated host, also see [docs/plugin-convergence-plan.md](./docs/plugin-convergence-plan.md).

## Showcase Expectations

The GitHub Pages showcase is a demo host for the open-source packages. It is meant to make the interaction model easy to inspect and test.

It is not a promise that every visual detail is identical to the LeafTab extension.

What the showcase is for:

- verifying the open-source interaction contract
- demonstrating reorder, merge, folder, and extraction behavior
- providing a public playground for the package layer

What it is not for:

- serving as the complete LeafTab app
- freezing LeafTab's exact product visuals as the only valid host presentation

## Examples

- `examples/custom-theme`
  Themed reference host for teams that want to keep the grid behavior contract while building a clearly different product aesthetic.
- `examples/leaftab-like`
  Recommended reference host when you want a close-to-LeafTab starting point built with `grid-core`, `grid-react`, and `grid-preset-leaftab`.
- `examples/showcase`
  Product-style public demo host built on the workspace packages.
- `examples/minimal`
  Smallest local example showing how to wire `grid-core` and `grid-react` together without the full preset layer.

## Local Development

Install dependencies once:

```bash
npm install
```

Build the packages:

```bash
npm run build
```

Run the GitHub Pages showcase locally:

```bash
npm run showcase:dev
```

Run the custom-theme example locally:

```bash
npm run custom-theme:dev
```

Run the close-to-LeafTab reference example locally:

```bash
npm run leaftab-like:dev
```

Run the minimal example locally:

```bash
npm run minimal:dev
```

Build the GitHub Pages showcase:

```bash
npm run showcase:build
```

Build the custom-theme example:

```bash
npm run custom-theme:build
```

Build the close-to-LeafTab reference example:

```bash
npm run leaftab-like:build
```

Build the minimal example:

```bash
npm run minimal:build
```

Preview the built showcase:

```bash
npm run showcase:preview
```

Preview the built custom-theme example:

```bash
npm run custom-theme:preview
```

Preview the built close-to-LeafTab reference example:

```bash
npm run leaftab-like:preview
```

## Validation

Before pushing changes or publishing packages, run:

```bash
npm run verify
```

For the ordered quality gate that mirrors the dependency chain, run:

```bash
npm run quality:ordered
```

This runs typecheck, tests, workspace builds, and package publishability checks through `npm pack --dry-run`.

## Development Workflow With LeafTab

To avoid the LeafTab app repo and this package repo drifting apart, use this rule:

> shared grid behavior changes land here first

Practical workflow:

1. Change reusable drag, layout, or adapter behavior in `leaftab-grid`.
2. Run `npm run build` here.
3. Rebuild `LeafTab`, which consumes this repo through local `file:` dependencies during co-development.
4. Only adjust thin host adapters or visuals inside `LeafTab` when the shared package layer is not the right place.

What belongs here:

- drag behavior
- reorder and merge rules
- folder extraction behavior
- grid measurement and layout logic
- reusable React adapters

What should stay in LeafTab:

- card visuals and product styling
- dialogs, toasts, and extension flows
- persistence
- app policy and scenario-specific behavior

## Docs

- Behavior contract: [docs/compact-grid-rules.md](./docs/compact-grid-rules.md)
- Concepts guide: [docs/shortcut-grid-concepts.md](./docs/shortcut-grid-concepts.md)
- Comparison guide: [docs/shortcut-grid-comparison.md](./docs/shortcut-grid-comparison.md)
- Quick start: [docs/quick-start.md](./docs/quick-start.md)
- Release process: [docs/release-process.md](./docs/release-process.md)
- Execution plan: [docs/leaftab-grid-execution-plan.md](./docs/leaftab-grid-execution-plan.md)
- LeafTab preset alignment checklist: [docs/leaftab-preset-alignment-checklist.md](./docs/leaftab-preset-alignment-checklist.md)
- Sync guide: [docs/leaftab-grid-sync-guide.md](./docs/leaftab-grid-sync-guide.md)
- LeafTab-like integration guide: [docs/leaftab-like-host-guide.md](./docs/leaftab-like-host-guide.md)
- GitHub Pages guide: [docs/github-pages-showcase.md](./docs/github-pages-showcase.md)
- Repository presentation kit: [docs/repository-presentation.md](./docs/repository-presentation.md)
- Extraction architecture: [docs/shortcut-grid-extraction-architecture.md](./docs/shortcut-grid-extraction-architecture.md)
- Migration map: [docs/leaftab-grid-migration-map.md](./docs/leaftab-grid-migration-map.md)

## Status

Current repository status:

- `@leaftab/grid-core` is a standalone package with its own source, tests, typecheck, and build pipeline.
- `@leaftab/grid-react` includes reusable `RootShortcutGrid` and `FolderShortcutSurface` adapters plus the shared drag-motion primitives they build on.
- `examples/showcase` powers the GitHub Pages demo for this repo.
- the public behavior layer is already test-covered

The current supported interaction model guarantees:

- root shortcuts
- folders with one child level

Nested folders are intentionally outside the first public interaction contract.

## License

GPL-3.0-or-later

This stays aligned with the main LeafTab project license.
