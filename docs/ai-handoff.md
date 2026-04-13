# AI Handoff

This document summarizes the current state of the standalone `leaftab-grid` repo so another AI can continue work quickly.

## Goal

Keep `leaftab-grid` as the single source of truth for Leaftab's reusable grid engine and React adapters, while `Leaftab` consumes it as a host app through local package dependencies.

## Current Repo Status

Repo:

- `/Users/mason/Desktop/leaftab-grid`

Current package shape:

- `packages/grid-core`
- `packages/grid-react`
- `snapshot/`

## `@leaftab/grid-core`

This package is already established and validated.

Included areas:

- shortcut types needed by the package
- model selectors and mutations
- supported-tree constraints
- unified drop-intent application
- pointer drag math
- drag-motion helpers
- drop-edge math
- grid layout packing
- root drop-intent resolution
- tests adapted to package-local imports

Validation already completed successfully:

- `npm run typecheck`
- `npm run test`
- `npm run build`

## `@leaftab/grid-react`

This package now contains real React adapters, not just early primitives.

Important files:

- `/Users/mason/Desktop/leaftab-grid/packages/grid-react/src/index.ts`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-react/src/RootShortcutGrid.tsx`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-react/src/FolderShortcutSurface.tsx`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-react/src/rootShortcutGridHelpers.ts`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-react/src/rootShortcutGridHelpers.test.ts`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-react/src/GridDragItemFrame.tsx`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-react/src/useDragMotionState.ts`

What is now true:

- the package exposes a reusable root-grid behavior adapter
- the package exposes a reusable folder-surface behavior adapter
- Leaftab no longer needs to keep full in-app engine copies of those layers

## Host App Integration Status

The main app repo:

- `/Users/mason/Desktop/Leaftab`

Now consumes this repo through local `file:` dependencies:

- `@leaftab/grid-core: file:../leaftab-grid/packages/grid-core`
- `@leaftab/grid-react: file:../leaftab-grid/packages/grid-react`

Important host-side files:

- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/components/RootShortcutGrid.tsx`
- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/components/FolderShortcutSurface.tsx`
- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/components/leaftabGridVisuals.tsx`
- `/Users/mason/Desktop/Leaftab/src/components/ShortcutGrid.tsx`

Current host architecture:

- `Leaftab` keeps thin wrappers and host-specific visuals
- `leaftab-grid` owns reusable behavior and adapters

Validation already observed in the host app:

- `npm run build:community` passes in `/Users/mason/Desktop/Leaftab`

## Source Of Truth Rule

This is the key maintenance rule:

> shared behavior changes land in `leaftab-grid` first

That means:

- drag rules belong here
- layout and measurement behavior belong here
- reusable adapter behavior belongs here
- Leaftab-only visuals and app policy do not belong here

## Safe Workflow

For engine changes:

1. Edit `leaftab-grid`
2. Run `npm run build`
3. Rebuild `Leaftab`
4. Only touch host wrappers if package props changed

For Leaftab-only changes:

1. Edit `Leaftab`
2. Keep package contracts stable if possible
3. Validate with `npm run build:community`

## Current Constraints

- do not over-generalize this into a universal DnD framework
- nested folders remain outside the current public contract
- `snapshot/` is still useful as an extraction reference, so do not remove it yet
- there may be uncommitted local changes in `packages/grid-react` from the latest extraction pass

## Recommended Next Step

The next high-value step is:

- continue shrinking what remains of Leaftab-specific behavior so app wrappers stay focused on visuals and host policy only

Practical follow-ups:

1. Move any remaining reusable behavior helpers into `grid-react`
2. Keep Leaftab rendering defaults grouped on the app side
3. Add or refine package docs/examples as the API stabilizes

## Short State Summary

- `grid-core` is stable and validated
- `grid-react` now includes `RootShortcutGrid` and `FolderShortcutSurface`
- `Leaftab` now consumes this repo through local `file:` dependencies
- the intended maintenance model is now package-first, host-second
