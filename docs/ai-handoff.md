# AI Handoff

This document summarizes the work completed across the current extraction phase so another AI can continue without replaying the whole conversation.

## Goal

Extract the shortcut-grid and folder-aware drag system from the main `Leaftab` project into a standalone open-source project named `Leaftab Grid`, without over-optimizing or turning it into a generic drag-and-drop framework.

High-level product focus:

- desktop-style icon grid interactions
- root-grid reorder
- drag into folder
- reorder inside folder
- drag out of folder back to root
- consistent drag motion and settle animation
- support for small and large folders

## User Decisions

- Open-source project name: `Leaftab Grid`
- Repository name: `leaftab-grid`
- License: `GPL-3.0-or-later`
- Preferred maintenance strategy:
  keep `Leaftab` as the working source during extraction, then move toward standalone packages, instead of manually maintaining two diverging copies
- Optimization constraint:
  improve architecture only where it helps extraction and open-sourcing; avoid endless abstraction

## Source Repo Context

Main source repo:

- `/Users/mason/Desktop/Leaftab`

Standalone extraction repo:

- `/Users/mason/Desktop/leaftab-grid`

The extraction started inside the main `Leaftab` repo first, then a new standalone repo was created and bootstrapped from that work.

## What Was Done In The Main `Leaftab` Repo

These architecture changes were already implemented in the source repo before the standalone repo was created.

### Domain and drag seams extracted

Added pure logic modules:

- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/domain/dropIntents.ts`
- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/drag/pointerDragSession.ts`
- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/drag/dragMotion.ts`
- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/drag/useDragMotionState.ts`
- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/drag/gridLayout.ts`
- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/model/constraints.ts`

Added tests:

- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/domain/__tests__/dropIntents.test.ts`
- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/drag/__tests__/pointerDragSession.test.ts`
- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/drag/__tests__/dragMotion.test.ts`
- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/drag/__tests__/gridLayout.test.ts`
- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/model/__tests__/constraints.test.ts`

Updated config:

- `/Users/mason/Desktop/Leaftab/vitest.node.config.ts`

### Behavior and architecture changes

- Unified shortcut drop outcomes through domain logic in `dropIntents.ts`
- Moved root grid layout packing logic out of `ShortcutGrid.tsx`
- Added explicit supported-tree constraint for open-source boundary:
  only root level plus one folder child level
- Added shared drag-motion state and pointer session math
- Added render seams to `ShortcutGrid.tsx` so the behavior layer is less tied to Leaftab visuals
- Added a neutral adapter entry:
  `/Users/mason/Desktop/Leaftab/src/features/shortcuts/components/RootShortcutGrid.tsx`
- Switched several app imports to use the neutral root-grid entry

### Important bug fix completed

The folder-internal drag issue was investigated and fixed:

- symptom:
  after dropping an icon inside a folder, sibling icons played an extra unwanted motion
- root cause:
  folder-internal drag cleanup was missing the same settle/projection suppression logic used by the root grid
- result:
  folder-internal drag no longer plays the extra sibling displacement after drop

Relevant file:

- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/components/FolderShortcutSurface.tsx`

### Architecture docs added in the source repo

- `/Users/mason/Desktop/Leaftab/docs/shortcut-grid-extraction-architecture.md`
- `/Users/mason/Desktop/Leaftab/docs/leaftab-grid-open-source-plan.md`
- `/Users/mason/Desktop/Leaftab/docs/leaftab-grid-readme.md`
- `/Users/mason/Desktop/Leaftab/docs/leaftab-grid-package-blueprint.md`
- `/Users/mason/Desktop/Leaftab/docs/leaftab-grid-migration-map.md`
- `/Users/mason/Desktop/Leaftab/docs/leaftab-grid-template/package.template.json`
- `/Users/mason/Desktop/Leaftab/docs/leaftab-grid-template/packages/grid-core.package.template.json`
- `/Users/mason/Desktop/Leaftab/docs/leaftab-grid-template/packages/grid-react.package.template.json`
- `/Users/mason/Desktop/Leaftab/docs/leaftab-grid-template/exports.template.md`

### Validation completed in the source repo

Pure-logic test chain was run successfully in the source repo.

Final reported result there:

- `38 passed`

## Standalone Repo Creation

New local repo created here:

- `/Users/mason/Desktop/leaftab-grid`

Initial bootstrap commit:

- `ed65c51`
- message: `Initial Leaftab Grid extraction snapshot`

The standalone repo started as:

- docs
- package templates
- package skeletons
- a `snapshot/` mirror copied from the current Leaftab extraction boundary

## Current Standalone Repo Status

Current repo HEAD at the time of writing:

- `6c23fbb`

Current shape:

- `packages/grid-core`
- `packages/grid-react`
- `snapshot/`
- docs and templates

### `@leaftab/grid-core` status

This is now a real standalone package, not just a placeholder.

Important files:

- `/Users/mason/Desktop/leaftab-grid/packages/grid-core/src/index.ts`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-core/src/shortcutTypes.ts`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-core/src/model/*`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-core/src/domain/dropIntents.ts`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-core/src/drag/*`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-core/tsconfig.json`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-core/vitest.config.ts`

What is included:

- shortcut types needed by the core package
- model selectors and operations
- tree constraints
- unified drop intent application
- pointer drag math
- drag-motion helpers
- drop-edge math
- grid layout packing
- root drop intent resolution
- pure tests copied and adapted to package-local imports

Bootstrap commit for this step:

- `79bb3db`
- message: `Bootstrap standalone grid-core package`

### `@leaftab/grid-react` status

This package is no longer an empty shell, but it is still early-stage.

Current exported primitives:

- `/Users/mason/Desktop/leaftab-grid/packages/grid-react/src/useDragMotionState.ts`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-react/src/GridDragItemFrame.tsx`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-react/src/index.ts`

What is included:

- shared drag settle and FLIP motion state hook
- generic draggable item frame component

What is not yet included:

- standalone `RootShortcutGrid`
- folder surface adapter
- visual default card system
- host-level root/folder interaction adapters

Commit for this step:

- `6c23fbb`
- message: `Add initial grid-react primitives`

### `snapshot/` status

`snapshot/` remains intentionally in the repo as a reference boundary.

Purpose:

- preserve the original extraction source shape
- make it easier to continue lifting code into `grid-core` and `grid-react`
- avoid losing track of what still depends on Leaftab-specific components or styling

## Validation Completed In The Standalone Repo

At the standalone repo level, these commands were run successfully:

- `npm install`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Results:

- `@leaftab/grid-core` typecheck passes
- `@leaftab/grid-core` build passes
- `@leaftab/grid-core` test suite passes with `38 passed`
- `@leaftab/grid-react` typecheck passes
- `@leaftab/grid-react` build passes
- workspace-level `typecheck / test / build` pass

## Key Architecture Decisions Already Made

These decisions should be preserved unless there is a strong reason to change them.

1. Do not turn this into a generic all-purpose DnD framework.
2. Preserve the product identity:
   desktop-style shortcut grid with folder-aware interactions.
3. Share core logic between root grid and folder grid, but do not force them into one giant component.
4. Keep pure logic separate from React adapters.
5. Explicitly keep nested folders out of the first public contract.
6. Avoid over-abstracting visual layers before the extraction boundary is clean.

Target package direction:

- `@leaftab/grid-core`
  pure types, model logic, domain logic, drag math, layout logic
- `@leaftab/grid-react`
  shared React state and UI adapters

## Recommended Next Step

The next most valuable step is:

- start extracting a real `RootShortcutGrid` adapter into `@leaftab/grid-react`

Recommended approach:

1. Do not move the whole Leaftab `ShortcutGrid.tsx` in one shot.
2. Start by lifting a thin host-agnostic adapter layer.
3. Keep Leaftab-specific rendering and icon/card visuals outside the first extracted adapter when possible.
4. Reuse the render seams that were already added in the source repo.

Likely source references:

- `/Users/mason/Desktop/leaftab-grid/snapshot/src/features/shortcuts/components/RootShortcutGrid.tsx`
- `/Users/mason/Desktop/leaftab-grid/snapshot/src/components/ShortcutGrid.tsx`
- `/Users/mason/Desktop/leaftab-grid/snapshot/src/features/shortcuts/components/DraggableShortcutItemFrame.tsx`

## Suggested Near-Term Roadmap

Reasonable next sequence:

1. Extract `RootShortcutGrid` into `@leaftab/grid-react`
2. Extract the folder-surface React adapter
3. Replace remaining Leaftab-specific React dependencies with package-level seams
4. Add a minimal example/demo app
5. Decide whether and when to remove or shrink `snapshot/`

## Things To Be Careful About

1. Do not regress the folder drop animation fix that was already solved in the main repo.
2. Do not accidentally reintroduce nested-folder support as an implied public feature.
3. Do not let `grid-react` start depending on a large number of Leaftab-only utilities.
4. Do not remove `snapshot/` too early; it is still useful as an extraction map.
5. Avoid large-scale renaming churn unless it directly helps package boundaries.

## Files Worth Reading First

In the standalone repo:

- `/Users/mason/Desktop/leaftab-grid/README.md`
- `/Users/mason/Desktop/leaftab-grid/docs/shortcut-grid-extraction-architecture.md`
- `/Users/mason/Desktop/leaftab-grid/docs/leaftab-grid-open-source-plan.md`
- `/Users/mason/Desktop/leaftab-grid/docs/leaftab-grid-package-blueprint.md`
- `/Users/mason/Desktop/leaftab-grid/docs/leaftab-grid-migration-map.md`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-core/src/index.ts`
- `/Users/mason/Desktop/leaftab-grid/packages/grid-react/src/index.ts`

In the original source repo:

- `/Users/mason/Desktop/Leaftab/src/components/ShortcutGrid.tsx`
- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/components/FolderShortcutSurface.tsx`
- `/Users/mason/Desktop/Leaftab/src/features/shortcuts/components/RootShortcutGrid.tsx`

## Short State Summary

If another AI needs the shortest possible summary:

- the main Leaftab repo already has the critical logic seams extracted and one folder drag animation bug fixed
- a standalone repo named `Leaftab Grid` has been created locally
- `grid-core` is already a real package with passing tests and build
- `grid-react` now has initial shared primitives, but not yet the full root or folder adapter components
- the next step is to extract `RootShortcutGrid` carefully, not to start over
