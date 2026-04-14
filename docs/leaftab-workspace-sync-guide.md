# Leaftab Workspace Sync Guide

This guide defines how `leaftab-workspace` and the main LeafTab app should evolve without drifting apart.

The short version:

- one source of truth per layer
- no parallel reinvention
- extract and converge, do not fork and hope

## Why This Guide Exists

There are now two related codebases:

- the main LeafTab app
- the open-source `leaftab-workspace` repository

That is useful, but it creates one obvious risk:

- the open-source preset and the real plugin host layer may slowly become different systems

This guide exists to prevent that.

## Core Rule

For anything described as `LeafTab-like`, the real LeafTab app remains the reference implementation until the shared preset is stable enough to be consumed back by the app itself.

That means:

- the plugin defines the real behavior and feel
- `workspace-preset-leaftab` mirrors and organizes that host layer
- the showcase demonstrates the preset
- the showcase must not become the accidental product truth

## Source Of Truth By Layer

### `@leaftab/workspace-core`

Source of truth:

- `leaftab-workspace`

This layer should own:

- shared layout math
- drag intent resolution
- shortcut tree operations
- folder-aware drop outcomes

### `@leaftab/workspace-react`

Source of truth:

- `leaftab-workspace`

This layer should own:

- reusable React adapters
- shared drag-motion lifecycle
- preview geometry
- generic rendering hooks

### `@leaftab/workspace-preset-leaftab`

Reference source of truth:

- real LeafTab host implementation

Published source of truth:

- `leaftab-workspace`

This layer should own:

- LeafTab-like metrics
- LeafTab-like target-region helpers
- LeafTab-like rendering primitives
- host utilities that are specific to the LeafTab visual and interaction style

### LeafTab app-only layer

Source of truth:

- `LeafTab`

This layer should own:

- dialogs
- persistence
- sync and extension policy
- unrelated product UI
- app-only flows

## The Safe Workflow

Use this workflow whenever work touches shared host behavior.

1. Identify the layer first.
2. Check whether the real LeafTab app already has an implementation for it.
3. If it is reusable, extract or mirror it into `leaftab-workspace`.
4. Verify in the showcase.
5. Only after it is stable, consider consuming it back in the plugin.

This is safer than inventing a new open-source version first and trying to retrofit the plugin later.

## What To Do When You Need To Change Something

### If it is pure shared behavior

Examples:

- drag math
- reorder logic
- folder extraction rules
- packed layout behavior

Do this:

1. change `leaftab-workspace`
2. test there first
3. rebuild and verify the plugin against the new shared behavior

### If it is LeafTab-like host behavior

Examples:

- compact metrics
- folder preview visuals
- target-region geometry
- drag/drop preview styling

Do this:

1. compare against the current LeafTab implementation
2. update `workspace-preset-leaftab` to match or move closer
3. verify in the showcase
4. record the status in the alignment checklist

### If it is plugin-only product behavior

Examples:

- merge naming dialogs
- sync or storage flows
- product-specific overlays

Do this:

1. keep it in the LeafTab app
2. do not force it into the open-source packages

## What Not To Do

Avoid these patterns:

- changing the same host behavior independently in both repos
- adding showcase-only behavior and later treating it as the real LeafTab style
- moving app-only product code into the preset just because it is convenient
- rewriting the plugin to consume unstable preset code too early

## Required Reference Files

Before changing `workspace-preset-leaftab`, compare against these files in the LeafTab app:

- `LeafTab/src/features/shortcuts/components/RootShortcutGrid.tsx`
- `LeafTab/src/features/shortcuts/drag/compactRootDrag.ts`
- `LeafTab/src/components/shortcuts/compactFolderLayout.ts`
- `LeafTab/src/components/shortcuts/ShortcutCardCompact.tsx`
- `LeafTab/src/components/shortcuts/ShortcutFolderPreview.tsx`
- `LeafTab/src/features/shortcuts/components/leaftabGridVisuals.tsx`
- `LeafTab/src/utils/shortcutIconSettings.ts`

Also check:

- [docs/leaftab-preset-alignment-checklist.md](./leaftab-preset-alignment-checklist.md)
- [docs/plugin-convergence-plan.md](./plugin-convergence-plan.md)

## Verification Checklist

After each meaningful change:

1. run package `typecheck`
2. run package `test`
3. run `showcase:build`
4. check the local preview
5. update the alignment checklist if the change affects preset parity

## When Plugin Convergence Can Start

The plugin should start consuming preset code only when:

- the relevant preset slice is stable
- the preset behavior is already verified against the plugin
- the alignment checklist no longer marks that area as a major mismatch

Until then, the preset should converge toward the plugin, not the other way around.

For the currently recommended first shared slice, see:

- [docs/plugin-convergence-plan.md](./plugin-convergence-plan.md)
