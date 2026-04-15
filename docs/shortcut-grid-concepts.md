# Shortcut Grid Concepts

This guide explains the main concepts behind `leaftab-workspace` without assuming that you already know the codebase.

If you only read one conceptual document before integrating the packages, read this one and [compact-grid-rules.md](./compact-grid-rules.md).

## The Three Layers

The repository is intentionally split into three public layers.

### `@leaftab/workspace-core`

This is the domain and mutation layer.

It owns:

- shortcut tree shape
- folder constraints
- reorder, merge, move-into-folder, and extraction outcomes
- packed grid layout helpers

It does not know about React or page styling.

### `@leaftab/workspace-react`

This is the interaction shell.

It owns:

- root-grid pointer drag lifecycle
- folder-surface pointer drag lifecycle
- hover stability and projection behavior
- rendering hooks for host apps

It does not decide your final visual design.

### `@leaftab/workspace-preset-leaftab`

This is the current host preset layer.

It owns:

- compact sizing defaults
- LeafTab-like item layout helpers
- target-region helpers
- drop-preview helpers
- a lightweight preset renderer set

It is not the whole LeafTab app.

## Shortcut Tree

The public shortcut model is intentionally simple.

Today it supports:

- root shortcuts
- folders
- one folder child level

It intentionally does not support nested folders as part of the first public contract.

That boundary matters because many drag rules become much more complex once nested containers are allowed.

## Root Grid

The root grid is the main surface where shortcuts live.

Its responsibilities are:

- display packed shortcut items in a compact grid
- allow reorder
- allow merge of one link onto another
- allow move-into-folder by dropping a link onto a folder center
- preserve stable visual projection while the pointer crosses gaps and neutral zones

This is the behavior that makes the project feel closer to a desktop launcher than to a generic sortable list.

## Folder Surface

The folder surface is a secondary interaction surface for a folder's children.

Its responsibilities are narrower:

- reorder inside the folder
- start extraction back to the root grid

Important difference from the root grid:

- the folder surface is reorder-only
- it does not create new merge or move-into-folder intents

That simplification keeps folder interactions predictable.

## Drop Intents

The root grid can resolve three semantic outcomes:

- `reorder-root`
- `merge-root-shortcuts`
- `move-root-shortcut-into-folder`

The folder surface resolves:

- `reorder-folder-shortcuts`
- `extract-folder-shortcut`

These are not presentation details. They are the actual public behavior contract.

## Interaction Intent vs Visual Projection

One of the most important ideas in this repo is that the grid separates:

- the semantic intent under the current recognition point
- the visual slot that should stay projected on screen

Why that matters:

- while dragging, the pointer often crosses ambiguous space
- if the system only used the immediate raw hover result, the grid would flicker or collapse
- keeping visual projection stable makes the grid feel intentional instead of fragile

This is a major reason the package behaves differently from simpler sortable systems.

## Recognition Point

The engine does not treat the raw pointer position as the only truth.

Instead it derives a recognition point from:

- the pointer position
- the dragged preview offset
- the dragged preview geometry

That point is what decides:

- target activation
- merge vs reorder
- sticky slot preservation

## Target Regions

Each target effectively has three regions:

- `targetCellRegion`
- `targetIconRegion`
- `targetIconHitRegion`

Why there are three:

- full cell area helps candidate selection and stability
- icon body area is what really matters for merge and edge classification
- icon hit region helps proximity logic and exclusion rules

If a host collapses all three into one rectangle, the grid may still work, but it will usually feel worse.

## Large Folders And Spans

Large folders are not a separate behavior engine.

They are normal grid items with larger spans.

That means:

- the same packed layout model still applies
- the same reorder model still applies
- the same target-region logic still applies

What changes is:

- width and height
- `columnSpan`
- `rowSpan`
- preview geometry

## External Drag Session Handoff

When a child is extracted from a folder, the drag session is handed back to the root grid instead of being restarted as an unrelated interaction.

That handoff is important because it keeps:

- motion continuity
- visual continuity
- stable intent resolution

The current extraction model is:

- the child is inserted back into the root list right after its source folder
- the returned root drag session becomes reorder-only
- root placement is then resolved by choosing among projected root reorder slots, not by re-entering normal merge / directional target logic

Without that handoff, extraction would feel much rougher.

## Host Responsibilities

Even though the repo gives you the behavior engine, a host app still decides:

- final card visuals
- final folder panel shell
- persistence
- menus, dialogs, toasts, and product flows

The package gives you the interaction contract. Your host gives it a product wrapper.

## Recommended Mental Model

Think about `leaftab-workspace` like this:

- `workspace-core` answers "what state change should happen?"
- `workspace-react` answers "how should drag interaction stay stable while that is happening?"
- the host answers "what should this feel and look like in my product?"
