# Leaftab Grid

A folder-aware desktop-style icon grid extracted from Leaftab.

Leaftab Grid is a desktop-style shortcut grid system built for icon surfaces that need more than simple sortable lists. It supports root-grid reordering, folder grouping, folder-aware drag targets, folder extraction back into the root surface, and shared drag motion behavior between root and folder grids.

Current release stage: `0.1.x alpha`

## Why it exists

Most open-source drag-and-drop grids stop at plain reordering. Leaftab Grid focuses on the interaction model behind desktop-like shortcut systems:

- reorder icons in a real grid
- drag shortcuts into folders
- reorder items inside folders
- extract items back out of folders
- preserve consistent drag motion across root and folder surfaces
- support span-aware layout behavior for larger folder tiles

## Scope

The first public contract focuses on:

- root shortcut grids
- folder-aware drag and drop
- one folder child level
- pure layout and drag logic
- React adapters for production-style interactions

Current non-goals:

- nested folder interactions
- application-specific dialogs and persistence flows
- unrelated Leaftab home-page UI

## Packages

- `@leaftab/grid-core`
  Pure layout, drag, and domain logic.
- `@leaftab/grid-react`
  React adapters and interaction state for the grid UI.

## Validation

Before pushing changes or publishing packages, run:

```bash
npm run verify
```

This verifies typecheck, tests, builds, and package publishability through `npm pack --dry-run`.

## Core capabilities

- span-aware grid packing
- drag intent resolution for root shortcuts
- merge and move-into-folder outcomes
- folder reorder and extract outcomes
- shared pointer drag session helpers
- shared FLIP and settle-motion helpers

## Design principles

- desktop-style interactions first
- folder-aware behavior is a first-class feature
- pure domain logic should stay separate from app UI
- host applications own dialogs, persistence, and product policy

## Status

Leaftab Grid is extracted from a production-oriented shortcut surface inside Leaftab and is being shaped into a standalone open-source module.

Current repository status:

- `@leaftab/grid-core` is a real standalone package with its own source, tests, typecheck, and build pipeline.
- `@leaftab/grid-react` now includes reusable `RootShortcutGrid` and `FolderShortcutSurface` adapters, plus the shared drag-motion primitives they build on.
- publishability is checked through `npm run verify`, including package builds, tests, typecheck, and `npm pack --dry-run`.
- `snapshot/` remains as a reference boundary for the legacy extraction source.

The current supported interaction model guarantees:

- root shortcuts
- folders with one child level

Nested folders are intentionally outside the first public interaction contract.

## Development workflow

To avoid the Leaftab app repo and this package repo drifting apart, use this rule:

> shared grid behavior changes land here first

Practical workflow:

1. Change reusable drag, layout, or adapter behavior in `leaftab-grid`
2. Run `npm run build`
3. Rebuild `Leaftab`, which consumes this repo through local `file:` dependencies
4. Only adjust thin host adapters or visuals inside `Leaftab` if needed

What belongs here:

- drag behavior
- reorder and merge rules
- folder extraction behavior
- grid measurement and layout logic
- reusable React adapters

What should stay in `Leaftab`:

- card visuals
- dialogs and toasts
- persistence
- app policy and scenario flows

This keeps `leaftab-grid` as the single source of truth for the engine while still allowing fast local co-development with the host app.

## Origin

Leaftab Grid began as the shortcut grid system inside Leaftab.

## License

GPL-3.0-or-later

This stays aligned with the main Leaftab project license.
