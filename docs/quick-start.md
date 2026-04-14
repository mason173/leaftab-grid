# Quick Start

This quick start is the fastest way to understand the repository structure and run the project locally.

## 1. Install Dependencies

```bash
npm install
```

## 2. Pick A Starting Point

You have four recommended local entry points.

### Minimal integration example

Best when you want to understand the smallest practical setup.

```bash
npm run minimal:dev
```

This starts:

- `examples/minimal`

Use it to learn:

- how `@leaftab/grid-core` applies shortcut-tree updates
- how `@leaftab/grid-react` renders root and folder surfaces
- the minimum host code needed to make the grid work

### Showcase

Best when you want to inspect the more product-like host and the current LeafTab-like preset layer.

```bash
npm run showcase:dev
```

This starts:

- `examples/showcase`

Use it to inspect:

- the public demo host
- `@leaftab/grid-preset-leaftab`
- the current open-source interaction contract

### Close-to-LeafTab reference host

Best when you want the clearest official example of how to wire the preset layer into a grid-first host that feels much closer to the LeafTab plugin structure.

```bash
npm run leaftab-like:dev
```

This starts:

- `examples/leaftab-like`

Use it to inspect:

- preset-driven root item layout
- preset-driven target-region and drop-preview behavior
- a root-grid plus folder-panel host structure closer to the plugin
- the recommended starting point for a LeafTab-like integration

### Custom-theme host

Best when you want to prove that the engine can support a very different visual system without giving up merge, folder extraction, or large-folder placement.

```bash
npm run custom-theme:dev
```

This starts:

- `examples/custom-theme`

Use it to inspect:

- custom card and folder visuals on top of the same behavior contract
- a host shell that looks intentionally unlike the LeafTab-like example
- the recommended starting point for a heavily customized launcher host

## 3. Build Everything You Need

Build the minimal example:

```bash
npm run minimal:build
```

Build the custom-theme host:

```bash
npm run custom-theme:build
```

Build the close-to-LeafTab reference host:

```bash
npm run leaftab-like:build
```

Build the showcase and its dependent packages:

```bash
npm run showcase:build
```

Build the entire workspace:

```bash
npm run build
```

## 4. Understand The Layers

The repository currently has three public layers:

### `@leaftab/grid-core`

Owns:

- shortcut tree operations
- drag math
- packed layout logic
- drop-intent resolution

### `@leaftab/grid-react`

Owns:

- `RootShortcutGrid`
- `FolderShortcutSurface`
- shared React drag lifecycle
- rendering hooks for host apps

### `@leaftab/grid-preset-leaftab`

Owns the current LeafTab-like host preset layer:

- compact metrics
- layout helpers
- target-region helpers
- drop-preview helpers
- LeafTab-like renderers

## 5. Choose The Right Integration Path

### Path A: Minimal custom host

Use:

- `@leaftab/grid-core`
- `@leaftab/grid-react`

Best for:

- learning the API
- building your own visual system
- understanding the host responsibilities clearly

Start from:

- `examples/minimal`

### Path B: Closer to LeafTab

Use:

- `@leaftab/grid-core`
- `@leaftab/grid-react`
- `@leaftab/grid-preset-leaftab`

Best for:

- getting closer to the current LeafTab feel
- using existing compact metrics and preset helpers
- building a launcher-style host faster

Start from:

- `examples/leaftab-like`
- `examples/showcase`
- [docs/leaftab-like-host-guide.md](./leaftab-like-host-guide.md)

### Path C: Heavily customized host

Use:

- `@leaftab/grid-core`
- `@leaftab/grid-react`
- optional `@leaftab/grid-preset-leaftab` geometry helpers

Best for:

- keeping the interaction contract while changing the product look substantially
- building a launcher host that should not feel like a LeafTab clone
- learning which pieces are engine versus host styling

Start from:

- `examples/custom-theme`
- [shortcut-grid-comparison.md](./shortcut-grid-comparison.md)

## 6. Read These Docs Next

- Behavior contract: [compact-grid-rules.md](./compact-grid-rules.md)
- Concepts guide: [shortcut-grid-concepts.md](./shortcut-grid-concepts.md)
- Comparison guide: [shortcut-grid-comparison.md](./shortcut-grid-comparison.md)
- Execution plan: [leaftab-grid-execution-plan.md](./leaftab-grid-execution-plan.md)
- Sync guide: [leaftab-grid-sync-guide.md](./leaftab-grid-sync-guide.md)
- LeafTab-like host guide: [leaftab-like-host-guide.md](./leaftab-like-host-guide.md)
- Preset alignment checklist: [leaftab-preset-alignment-checklist.md](./leaftab-preset-alignment-checklist.md)

## 7. Before Pushing Changes

Run:

```bash
npm run verify
```

For the explicit dependency-ordered quality gate, run:

```bash
npm run quality:ordered
```

Or at minimum run the checks relevant to the part you changed:

- package `typecheck`
- package `test`
- package `build`
- local example or showcase preview
