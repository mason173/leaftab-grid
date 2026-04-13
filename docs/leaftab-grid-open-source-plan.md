# Leaftab Grid Open Source Plan

`Leaftab Grid` is the folder-aware desktop-style icon grid extracted from Leaftab.

This document defines the first open-source shape for the project without forcing a large repo restructure inside the main app first.

## Project identity

- Project name: `Leaftab Grid`
- Suggested repository name: `leaftab-grid`
- Suggested npm scope: `@leaftab`
- Suggested license: `GPL-3.0-or-later`
- Suggested packages:
  - `@leaftab/grid-core`
  - `@leaftab/grid-react`

## Positioning

Use this as the short description:

> A folder-aware desktop-style icon grid extracted from Leaftab.

Use this as the longer description:

> Leaftab Grid is a desktop-style icon grid system with reorderable shortcut layouts, folder grouping, folder extraction, span-aware placement, and drag motion designed for real shortcut surfaces rather than simple sortable lists.

## What should be open-sourced first

The first public version should focus on the grid engine, not the whole Leaftab app shell.

Good first-scope candidates:

- shared grid layout packing
- root-grid drag intent resolution
- folder-grid reorder and extraction behavior
- drag session helpers
- drag motion helpers
- pure domain mutation outcomes
- thin React adapter components or hooks

Keep app-only concerns out of the first release:

- Leaftab dialogs
- Leaftab toasts
- scenario switching
- sync logic
- wallpaper and unrelated home-page UI

## Recommended package split

### `@leaftab/grid-core`

Owns pure logic and non-React helpers:

- `src/features/shortcuts/model/*`
- `src/features/shortcuts/domain/dropIntents.ts`
- `src/features/shortcuts/drag/gridLayout.ts`
- `src/features/shortcuts/drag/gridDragEngine.ts`
- `src/features/shortcuts/drag/dropEdge.ts`
- `src/features/shortcuts/drag/resolveRootDropIntent.ts`
- `src/features/shortcuts/drag/compactRootDrag.ts`
- `src/features/shortcuts/drag/pointerDragSession.ts`
- `src/features/shortcuts/drag/dragMotion.ts`
- `src/features/shortcuts/drag/types.ts`

### `@leaftab/grid-react`

Owns React-facing adapters:

- `src/features/shortcuts/drag/useDragMotionState.ts`
- `src/features/shortcuts/components/DraggableShortcutItemFrame.tsx`
- `src/features/shortcuts/components/FolderShortcutSurface.tsx`
- the extractable grid surface logic currently in `src/components/ShortcutGrid.tsx`

## Current boundary assumptions

The current public contract should explicitly state:

- the open-source grid supports root shortcuts plus one folder child level
- nested folders are not part of the supported interaction contract yet
- merge naming and host-app dialogs stay outside the grid core

This is already reflected in:

- `src/features/shortcuts/model/constraints.ts`
- `src/features/shortcuts/domain/dropIntents.ts`

## Source of truth workflow

For the current stage, keep this repository as the source of truth.

Recommended workflow:

1. Keep improving the grid inside the Leaftab repo.
2. Treat the grid-specific folders as the extraction boundary.
3. Mirror those folders into the standalone `leaftab-grid` repo when you are ready.
4. Do not maintain two divergent hand-edited copies.

That means:

- daily development happens here first
- the standalone open-source repo is synchronized from this boundary
- bug fixes land in Leaftab first, then are synced outward

## Sync strategy

Use one of these two strategies:

### Option A: Same repo first, split later

Best when the API is still settling.

- keep the implementation here
- refine the package boundary
- split into a dedicated repo later using `git subtree split` or a manual history-preserving extraction

### Option B: Dedicated repo now, mirror from this boundary

Best when you want a public identity immediately.

- create `leaftab-grid`
- copy only the extracted boundary files into that repo
- keep this repo as source of truth until the standalone repo becomes the primary package repo

For your current situation, Option B is reasonable if you want to publish now, but the rule should still be:

> one source of truth, one direction of sync

## Minimum first public API

The first release does not need to expose every internal helper.

A good initial public API would be:

- layout packing helpers
- root drag intent resolution
- shared drag/session types
- folder-aware drop application outcomes
- React drag motion state hook
- root grid and folder grid adapters, if you want to ship UI primitives early

## Release checklist

Before the first public release:

1. Copy or extract the README draft from `docs/leaftab-grid-readme.md`
2. Keep the license aligned with Leaftab as `GPL-3.0-or-later`
3. Add package entrypoints matching the chosen split
4. Export only the intended public surface
5. Keep tests for layout, drop intents, constraints, and drag math
6. Add a small demo or GIF showing:
   - root reorder
   - merge into folder
   - move into folder
   - reorder inside folder
   - extract from folder

## First repo bootstrap checklist

If you create the standalone `leaftab-grid` repository now, the first batch to copy or extract should be:

- `LICENSE`
- `docs/leaftab-grid-readme.md` as the new repo `README.md`
- `src/features/shortcuts/model/*`
- `src/features/shortcuts/domain/dropIntents.ts`
- `src/features/shortcuts/drag/gridLayout.ts`
- `src/features/shortcuts/drag/gridDragEngine.ts`
- `src/features/shortcuts/drag/dropEdge.ts`
- `src/features/shortcuts/drag/resolveRootDropIntent.ts`
- `src/features/shortcuts/drag/compactRootDrag.ts`
- `src/features/shortcuts/drag/pointerDragSession.ts`
- `src/features/shortcuts/drag/dragMotion.ts`
- `src/features/shortcuts/drag/useDragMotionState.ts`
- `src/features/shortcuts/drag/types.ts`
- `src/features/shortcuts/components/DraggableShortcutItemFrame.tsx`
- `src/features/shortcuts/components/FolderShortcutSurface.tsx`
- the grid-surface logic extracted from `src/components/ShortcutGrid.tsx`
- shortcut-grid related tests from `src/features/shortcuts/**/__tests__/*`

Files that should stay out of the first standalone repo:

- `src/App.tsx`
- sync, scenario, wallpaper, and unrelated product UI code
- Leaftab-only dialogs and toast flows

## Suggested standalone repo structure

```text
leaftab-grid/
  README.md
  LICENSE
  package.json
  packages/
    grid-core/
      package.json
      src/
    grid-react/
      package.json
      src/
  examples/
    basic-react-demo/
```

## What not to do yet

Avoid these for the first release:

- over-generalizing into a universal drag-and-drop framework
- supporting nested folders before the API is stable
- publishing too many low-level internals that you may want to change soon
- rewriting the whole Leaftab UI just to match the package split
