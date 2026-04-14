# Building A LeafTab-Like Host

This guide explains how to use `leaftab-workspace` to build a host app that feels close to the LeafTab shortcut surface.

The short version:

- the open-source packages already contain the shared interaction engine
- they do not yet publish the full LeafTab visual preset as one ready-made package
- to get close to LeafTab, your host must provide the same layout inputs and rendering strategy

## What You Get From This Repo

Use `@leaftab/workspace-core` for:

- shortcut tree operations
- drop-intent application
- packed layout behavior
- pointer-drag session math
- folder-aware drag outcomes

Use `@leaftab/workspace-react` for:

- `RootShortcutGrid`
- `FolderShortcutSurface`
- preview geometry
- drag motion lifecycle
- host-injected rendering and hit-region hooks

Use `@leaftab/workspace-preset-leaftab` when you want a LeafTab-like starting point for:

- compact metrics
- root-grid layout resolution
- compact target-region helpers
- a prewired root-grid preset via `createLeaftabRootGridPreset`

That is enough to build a real product.

## What You Still Need In Your Host

If you want results that feel close to LeafTab, your host app still needs to supply:

- shortcut card visuals
- folder preview visuals
- a simple icon presentation appropriate for your host
- compact layout metrics
- target-region geometry tuned to the compact card
- drop-preview rendering
- persistence and product flows

This is why a generic host can be behaviorally correct but still feel visually different from LeafTab.

## The Most Important Rule

Matching LeafTab is not only about using the same drag engine.

You also need the same:

- item dimensions
- icon body geometry
- title block height
- large-folder preview size
- merge hit areas
- reorder target regions

If those inputs differ, the end result will feel like a different product even when the underlying behavior engine is the same.

## Host Checklist

To build a host that feels close to LeafTab, align these pieces first.

### 1. Match compact metrics

The compact host should use the same kind of proportions that LeafTab uses:

- compact icon size around `72`
- title block height around `24`
- compact column gap around `12`
- row gap around `20` on desktop compact density
- large folder span of `2x2`

If these numbers drift too far, the grid immediately feels looser or denser than LeafTab.

### 2. Match item layout resolution

Your host should resolve layout per shortcut, not just assume every item is identical.

Important cases:

- normal shortcut tile
- small folder tile
- large folder tile
- preserved slot behavior for large folders

This is the layer that decides width, height, preview rect, and grid span.

### 3. Match compact target regions

This is one of the most important parts.

LeafTab does not treat the whole occupied cell as the same thing. It distinguishes between:

- full cell region
- actual icon body region
- icon hit region

That distinction is what keeps merge, reorder, and neutral travel feeling stable and intentional.

If a host only uses broad cell rectangles, it usually feels worse than LeafTab even when the reorder engine is technically working.

### 4. Match folder preview rendering

LeafTab's folder tiles do not look like generic boxes with letters.

To get closer, your host should render:

- small folder previews with compact child-icon composition
- large folder previews with a `3x3` style preview surface
- matching border radius and spacing

### 5. Match drag preview and drop preview

The drag preview and drop preview are part of the feel, not decoration.

If the preview size, border radius, or landing rectangle is off, the grid feels less precise even when the state transitions are correct.

### 6. Keep icon handling simple unless your product truly needs more

For this open-source repo, icon customization is intentionally not the main value.

Recommended default:

- use one simple icon presentation consistently
- avoid turning the preset into a full icon-management system
- only add richer icon logic in your own host if it is really product-critical

## Best Integration Pattern

The most reliable pattern is:

1. use `@leaftab/workspace-core` for state operations and drag outcomes
2. use `@leaftab/workspace-react` for the interaction shell
3. keep your card and folder visuals in your own host app
4. inject layout and target-region logic that matches your visual system

This keeps the shared engine reusable without forcing every host to look the same.

If you want a closer LeafTab-style host with less manual wiring, start from the preset helper layer first and then selectively override rendering where your host needs a different look.

## Recommended Starting Point

If your goal is "make it work", start from the smallest example in:

- `examples/minimal`

If your goal is "make it feel like LeafTab", start from the reference host in:

- `examples/leaftab-like`

Use the showcase in:

- `examples/showcase/src/App.tsx`

when you want the public demo shell, broader repository presentation, or a GitHub Pages surface.

For closer LeafTab convergence, compare the reference host against the real LeafTab host files below and gradually align them.

## Reference Files In The LeafTab App

These are the most useful reference files when trying to match LeafTab more closely:

- `LeafTab/src/features/shortcuts/components/RootShortcutGrid.tsx`
- `LeafTab/src/features/shortcuts/drag/compactRootDrag.ts`
- `LeafTab/src/components/shortcuts/compactFolderLayout.ts`
- `LeafTab/src/components/shortcuts/ShortcutCardCompact.tsx`
- `LeafTab/src/components/shortcuts/ShortcutFolderPreview.tsx`
- `LeafTab/src/features/shortcuts/components/leaftabGridVisuals.tsx`

They show the real host-side decisions that sit on top of the open-source engine.

## Why The Showcase May Still Differ

The public showcase is a standalone host app. It proves the open-source packages directly, but it intentionally stays lighter than the full LeafTab product.

That means the showcase may differ in:

- exact icon sourcing
- exact card renderer details
- exact folder preview visuals
- exact page chrome and theming

This does not mean the engine cannot support a LeafTab-like experience. It means the showcase is not yet packaged as the canonical LeafTab preset.

## What To Do If You Want A Near-LeafTab Result

Use this order:

1. make behavior correct first
2. align compact layout metrics
3. align target-region geometry
4. align folder preview rendering
5. align drag and drop previews
6. only align icon treatment if your host really needs that extra fidelity

If you skip straight to styling before aligning layout and target regions, the result may look similar but still feel wrong during drag operations.

## Current Limitation

The first public contract intentionally supports:

- root shortcuts
- folders with one child level

Nested folders are outside the current public interaction contract.
