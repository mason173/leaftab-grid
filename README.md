# Leaftab Grid

A desktop-style, folder-aware shortcut grid engine for launcher and browser start-page experiences.

Leaftab Grid is the open-source interaction layer extracted from [LeafTab](https://github.com/mason173/LeafTab). It is built for shortcut surfaces that need to feel more like a desktop, launcher, or new-tab workspace than a generic sortable list.

It focuses on behaviors that typical sortable grids usually do not cover well:

- true root-grid reorder
- merge two shortcuts into a folder
- move a shortcut into an existing folder
- reorder inside a folder surface
- drag a folder child back into the root grid
- span-aware placement for larger folder tiles

Current release stage: `0.2.x alpha`

## Why It Feels Different

Many drag-and-drop libraries are intentionally generic. Many grid libraries are intentionally dashboard-oriented. Leaftab Grid is different because it is opinionated about shortcut-workspace behavior:

- icon-body hit regions matter, not only whole-cell rectangles
- merge and reorder must coexist cleanly in the same surface
- folders are part of the interaction model, not an afterthought
- larger tiles must keep their slot and not collapse the whole layout
- root-grid and folder-surface interactions should feel like one connected system

If you want a shortcut surface that behaves like a real launcher or browser start page, this repo is designed for that use case.

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
- Alpha release notes draft: [docs/release-notes-v0.2.0-alpha.1.md](./docs/release-notes-v0.2.0-alpha.1.md)

## LeafTab Origin

Leaftab Grid was extracted from the production shortcut system inside LeafTab, the browser new-tab extension where these interactions were originally designed and refined.

LeafTab links:

- LeafTab repository: [github.com/mason173/LeafTab](https://github.com/mason173/LeafTab)
- Chrome Web Store: [LeafTab on Chrome Web Store](https://chromewebstore.google.com/detail/leaftab/lfogogokkkpmolbfbklchcbgdiboccdf?hl=zh-CN&gl=DE)
- Edge Add-ons: [LeafTab on Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/leaftab/nfbdmggppgfmfbaddobdhdleppgffphn)
- Firefox Add-ons: [LeafTab on Firefox Add-ons](https://addons.mozilla.org/zh-CN/firefox/addon/leaftab/)

## What This Repo Gives You

This repository publishes the reusable grid system, not the entire LeafTab product shell.

It gives you:

- a pure shortcut-tree and drag behavior layer
- a React adapter layer for root-grid and folder-surface interactions
- tests for the core behavior model
- a public behavior spec
- a close-to-LeafTab reference example for host integration
- a custom-theme example proving the engine can support a very different host look
- a showcase host app that demonstrates the open-source packages directly

It does not currently give you the full LeafTab product shell out of the box.

That means this repo does not try to publish every LeafTab-specific detail as a stable public API, including:

- LeafTab's exact card renderer
- LeafTab's exact folder preview visuals
- LeafTab's complete icon customization strategy
- LeafTab app flows such as dialogs, persistence, toasts, sync, and extension policy

If you want the interaction model, this repo is the source of truth.

If you want a 1:1 LeafTab look and feel, you still need a host layer that matches LeafTab's layout inputs, target-region math, and visual rendering.

## Current Public Shape

The repository now has three clear public layers:

- `@leaftab/grid-core`
- `@leaftab/grid-react`
- `@leaftab/grid-preset-leaftab`

That shape matters because it makes the project easier to understand and easier to adopt:

- `grid-core` owns behavior and tree operations
- `grid-react` owns reusable interaction shells
- `grid-preset-leaftab` owns the LeafTab-like host wiring and preset helpers

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

## Recommended Starting Points

- Start from `examples/minimal` if you want the smallest practical integration path.
- Start from `examples/leaftab-like` if you want something much closer to the real LeafTab interaction feel.
- Start from `examples/custom-theme` if you want proof that the engine can support a clearly different host look.
- Use `examples/showcase` when you want the public demo shell and GitHub Pages presentation layer.

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

## LeafTab Relationship

LeafTab remains the reference implementation for anything described as `LeafTab-like`.

That means:

- this repo is not trying to invent a second unrelated "LeafTab style"
- the preset converges toward the real app
- the plugin is now gradually beginning to consume shared preset wiring back from this repo

The long-term goal is not just to extract code once. The goal is to reduce duplicate host logic over time without flattening the LeafTab product into a generic demo.

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
- Alpha release notes draft: [docs/release-notes-v0.2.0-alpha.1.md](./docs/release-notes-v0.2.0-alpha.1.md)
- Execution plan: [docs/leaftab-grid-execution-plan.md](./docs/leaftab-grid-execution-plan.md)
- LeafTab preset alignment checklist: [docs/leaftab-preset-alignment-checklist.md](./docs/leaftab-preset-alignment-checklist.md)
- Sync guide: [docs/leaftab-grid-sync-guide.md](./docs/leaftab-grid-sync-guide.md)
- LeafTab-like integration guide: [docs/leaftab-like-host-guide.md](./docs/leaftab-like-host-guide.md)
- Plugin convergence plan: [docs/plugin-convergence-plan.md](./docs/plugin-convergence-plan.md)
- GitHub Pages guide: [docs/github-pages-showcase.md](./docs/github-pages-showcase.md)
- Repository presentation kit: [docs/repository-presentation.md](./docs/repository-presentation.md)
- Extraction architecture: [docs/shortcut-grid-extraction-architecture.md](./docs/shortcut-grid-extraction-architecture.md)
- Migration map: [docs/leaftab-grid-migration-map.md](./docs/leaftab-grid-migration-map.md)

## Status

Current repository status:

- `@leaftab/grid-core` is a standalone package with its own source, tests, typecheck, and build pipeline.
- `@leaftab/grid-react` includes reusable `RootShortcutGrid` and `FolderShortcutSurface` adapters plus the shared drag-motion primitives they build on.
- `@leaftab/grid-preset-leaftab` now provides LeafTab-like preset helpers for root-grid and folder-surface host wiring.
- `examples/showcase` powers the GitHub Pages demo for this repo.
- the public behavior layer is already test-covered
- the real LeafTab app has started consuming selected shared preset wiring back from this repo

The current supported interaction model guarantees:

- root shortcuts
- folders with one child level

Nested folders are intentionally outside the first public interaction contract.

## License

GPL-3.0-or-later

This stays aligned with the main LeafTab project license.
