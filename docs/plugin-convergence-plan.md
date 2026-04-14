# Plugin Convergence Plan

This document describes the safest way to start converging the real LeafTab app toward the shared `leaftab-grid` preset layer.

The goal is not to force the app to consume everything at once.

The goal is to start with the parts that are already stable enough to share without weakening the product experience.

## Current Principle

The plugin should consume shared code only where the shared package is already:

- behaviorally proven
- documented
- covered by tests
- still compatible with the real LeafTab host feel

That means plugin convergence should start from host wiring and geometry helpers, not from the richer app-only icon and product pipeline.

## Best First Shared Slice

The current safest first slice is the root-grid preset wiring in `@leaftab/grid-preset-leaftab`.

This slice now includes:

- `LEAFTAB_COMPACT_GRID_METRICS`
- `computeLeaftabLargeFolderPreviewSize`
- `resolveLeaftabRootItemLayout`
- `createLeaftabRootDropResolvers`
- `createLeaftabRootGridPreset`

Why this slice is the best first target:

- it already reflects the real LeafTab compact grid rules closely
- it is shared by the reference examples now
- it reduces repeated host glue without forcing the plugin to adopt the open-source renderer immediately

Current status:

- the real LeafTab app now consumes the shared preset for the root-grid helper layer
- the real LeafTab app now consumes the shared preset for the folder-surface item-layout helper layer
- plugin-owned rendering still remains local
- this means convergence has started without forcing the app to adopt the showcase renderer stack

## What The Plugin Should Keep Local For Now

Do not force these into the shared preset yet:

- the full `ShortcutCardCompact` renderer pipeline
- richer icon source handling
- app-specific dialogs and product flows
- persistence, sync, extension policy, and unrelated product UI

Those areas are still more valuable as plugin-owned surfaces than as premature public API.

## Recommended Migration Order

### Step 1: Share layout and target-region wiring

In the plugin root-grid wrapper, align or consume:

- `computeLeaftabLargeFolderPreviewSize`
- `resolveLeaftabRootItemLayout`
- `createLeaftabRootDropResolvers`

This is the lowest-risk migration because it preserves the plugin's own renderer while reusing the shared host math.

### Step 2: Evaluate the preset helper

Once Step 1 feels stable, evaluate whether the plugin wrapper can directly consume:

- `createLeaftabRootGridPreset`

This helper is useful because it packages the common root-grid wiring in one place:

- item layout resolution
- compact target-region resolution
- drop target rect resolution
- default LeafTab-like render hooks

Current status:

- this step has now started
- the plugin root-grid wrapper uses the shared preset helper for item layout and root drop resolvers
- the plugin folder-surface wrapper now uses the shared preset helper for item layout
- the plugin still overrides rendering with its richer local host renderer

### Step 3: Keep visual ownership selective

The plugin should continue to own:

- its richer card rendering
- its richer icon pipeline
- any product-specific visual policy

The shared preset should only absorb more of that surface if repeated real reuse proves it belongs there.

## Migration Success Criteria

The first plugin convergence pass is successful when:

- plugin root-grid layout and target-region helpers stop drifting from the preset
- repeated host glue in the plugin gets smaller
- the plugin still looks and feels like LeafTab, not like the showcase

## Verification Checklist

After each plugin convergence change:

1. Compare behavior against the current plugin interaction before and after the migration.
2. Run the relevant `leaftab-grid` quality checks.
3. Verify the plugin root-grid reorder, merge, large-folder placement, and extract flows manually.
4. Update the preset alignment checklist if the shared boundary changed.
