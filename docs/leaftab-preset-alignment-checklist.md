# LeafTab Preset Alignment Checklist

This document tracks how closely `@leaftab/grid-preset-leaftab` matches the real LeafTab host implementation.

Its purpose is simple:

- prevent drift
- make differences explicit
- give every future `LeafTab-like` change a reference point

## Reference Files In The LeafTab App

These are the current reference files for preset convergence:

- `LeafTab/src/features/shortcuts/components/RootShortcutGrid.tsx`
- `LeafTab/src/features/shortcuts/drag/compactRootDrag.ts`
- `LeafTab/src/components/shortcuts/compactFolderLayout.ts`
- `LeafTab/src/components/shortcuts/ShortcutCardCompact.tsx`
- `LeafTab/src/components/shortcuts/ShortcutFolderPreview.tsx`
- `LeafTab/src/features/shortcuts/components/leaftabGridVisuals.tsx`
- `LeafTab/src/utils/shortcutIconSettings.ts`

## Status Key

- `Aligned`
- `Partially aligned`
- `Not aligned yet`

## Current Alignment Table

### Compact metrics

- Status: `Aligned`
- Notes:
  - icon size `72`
  - title block height `24`
  - column gap `12`
  - large folder span `2x2`

### Large-folder preview sizing

- Status: `Aligned`
- Notes:
  - preset uses the same width-bound and height-bound logic as the real LeafTab host wrapper

### Root item layout

- Status: `Partially aligned`
- Notes:
  - regular link and large-folder sizing now follow the plugin model
  - small-folder and large-folder preview border radius now follow plugin formulas
  - further host-specific rendering details still differ visually

### Folder item layout

- Status: `Partially aligned`
- Notes:
  - preset now resolves preview geometry and radius based on shortcut kind
  - actual folder card rendering still differs from the plugin renderer

### Compact target-region math

- Status: `Aligned`
- Notes:
  - preset uses the same cell-region and icon-region shape as the current plugin host adapter
  - large-folder hit slop matches the current plugin setting

### Drop target rects

- Status: `Aligned`
- Notes:
  - preset returns cell region for outer drop rect and icon region for center rect, matching the plugin host adapter

### Shortcut icon border radius

- Status: `Aligned`
- Notes:
  - preset now uses LeafTab-style percentage corner radius for link tiles instead of fixed pixel radii

### Small-folder preview border radius

- Status: `Aligned`
- Notes:
  - preset now uses size-aware border-radius logic derived from the plugin implementation

### Large-folder preview border radius

- Status: `Aligned`
- Notes:
  - preset now uses size-aware large-folder radius logic derived from the plugin implementation

### Shortcut card rendering

- Status: `Partially aligned`
- Notes:
  - preset now intentionally uses a simpler and more stable icon presentation instead of chasing the full plugin icon pipeline
  - plugin still uses `ShortcutCardCompact` and the much richer `ShortcutIcon` pipeline
  - this difference is now treated as mostly intentional unless future product needs prove otherwise

### Folder preview rendering

- Status: `Partially aligned`
- Notes:
  - preset now uses a closer 2x2 / 3x3 composition, folder-surface sheen, backdrop blur, empty-state glyph, and a dedicated large-folder open tile treatment
  - plugin still has richer icon rendering, internal preview interactivity, and product-level polish

### Drag preview rendering

- Status: `Partially aligned`
- Notes:
  - preset now provides a Firefox-style lightweight drag preview fallback instead of using the same full preview path everywhere
  - non-Firefox hosts still use the richer preview card path
  - plugin still has tighter integration with its own icon pipeline and renderer stack

### Merge / center preview

- Status: `Partially aligned`
- Notes:
  - preset now uses a merge highlight overlay closer to the plugin approach
  - plugin still has tighter integration with its own card renderer and geometry helpers

### Drop preview styling

- Status: `Partially aligned`
- Notes:
  - preset and showcase use the same general visual idea
  - plugin still has slightly different rendering details and tighter integration

### Selection indicator support

- Status: `Partially aligned`
- Notes:
  - preset root item renderer now supports a LeafTab-like selection overlay
  - plugin still has a dedicated selection-indicator renderer path and tighter app integration

### Plugin consumption of preset

- Status: `Partially aligned`
- Notes:
  - the plugin now consumes the shared preset for the root-grid helper layer
  - the plugin folder-surface wrapper now also consumes the shared preset for item-layout wiring
  - current plugin consumption is intentionally limited to layout and drop-resolver wiring plus folder-surface item-layout wiring
  - plugin-owned card rendering, icon handling, and richer product visuals still remain local

## Immediate Follow-Up Items

These are the next preset-convergence items to implement:

1. Bring folder preview rendering closer to `ShortcutFolderPreview`.
2. Bring merge / center preview behavior even closer to `renderRootGridCenterPreview`.
3. Keep the preset icon layer intentionally simple unless a clearly reusable need emerges.
4. Evaluate which preset pieces are stable enough for eventual plugin consumption.
5. Start with the root-grid host wiring slice described in `docs/plugin-convergence-plan.md`, not the richer app-only icon pipeline.
