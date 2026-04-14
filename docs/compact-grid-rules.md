# Compact Grid Rules

This document is the canonical behavior spec for the shortcut grid extracted from LeafTab.

LeafTab links:

- Repository: <https://github.com/mason173/LeafTab>
- Chrome Web Store: <https://chromewebstore.google.com/detail/leaftab/lfogogokkkpmolbfbklchcbgdiboccdf?hl=zh-CN&gl=DE>
- Edge Add-ons: <https://microsoftedge.microsoft.com/addons/detail/leaftab/nfbdmggppgfmfbaddobdhdleppgffphn>
- Firefox Add-ons: <https://addons.mozilla.org/zh-CN/firefox/addon/leaftab/>

If a future change touches drag hit-testing, merge behavior, reorder state transitions, latch rules, bridge regions, or projected drop slots, update this document in `leaftab-grid` first.

## Scope

Current product reality:

- root grid behavior is `compact-only`
- drag behavior lives in `@leaftab/grid-react`
- host apps may supply visuals, layout inputs, and policy, but must not fork the behavior engine

This document covers:

- root-grid drag recognition
- root-grid reorder, merge, and move-into-folder behavior
- folder-surface reorder behavior
- sticky projection and bridge rules
- large-folder and variable-span reorder behavior

## Core Terms

### Recognition Point

Drag behavior is driven by the dragged icon's visual center, not by the raw mouse cursor.

The runtime computes a recognition point from:

- the current pointer position
- the drag preview offset
- the dragged item's preview geometry

This is the point that decides:

- which target is active
- which target edge is nearest
- whether the drag is in merge, neutral, or reorder state

### Target Regions

Each compact target exposes three related regions:

- `targetCellRegion`
  The full occupied cell area for candidate selection and latch preservation.
- `targetIconRegion`
  The target icon body's actual merge and edge-classification area.
- `targetIconHitRegion`
  The icon hit area used for proximity and source-self exclusion.

Important rule:

> edge classification uses the target icon body's edges, not the full cell edges

### Intents

The root grid distinguishes between two layers of intent:

- `interactionIntent`
  The semantic action currently under the recognition point.
- `visualProjectionIntent`
  The projected slot or preview that the UI should keep showing.

These may differ on purpose. That separation is what keeps the grid stable while moving through gaps, merge zones, and folders.

## Root Grid Intent Types

The root grid can resolve three behaviors:

- `reorder-root`
- `merge-root-shortcuts`
- `move-root-shortcut-into-folder`

The folder surface uses reorder-only behavior:

- `reorder-folder-shortcuts`
- `extract-folder-shortcut`

## Directional Rules

Relative target direction is computed from the dragged item's source icon region and the candidate target icon region.

Current directional contract:

| Target relative to dragged origin | Merge / move-into-folder edges | Reorder / yield edges |
| --- | --- | --- |
| Above | `right`, `bottom` | `left`, `top` |
| Below | `left`, `top` | `right`, `bottom` |
| Left on same row | `right`, `bottom` | `left`, `top` |
| Right on same row | `left`, `top` | `right`, `bottom` |

This is the current closed-loop rule set behind the compact grid.

## Root Target Zones

For a given target, the recognition point is classified into one of three zones:

- `merge`
  The recognition point is inside the target icon body.
- `neutral`
  The recognition point is outside the target icon body, but nearest to a merge-side edge.
- `reorder`
  The recognition point is outside the target icon body and nearest to a reorder-side edge.

Operational meaning:

- `merge` can create `merge-root-shortcuts` or `move-root-shortcut-into-folder`
- `neutral` should not create a fresh reorder by itself
- `reorder` is what causes yield, displacement, and claimed slot changes

## Merge And Reorder Semantics

### Root grid merge behavior

When the dragged item is a link and the recognition point enters a target icon body:

- target link -> `merge-root-shortcuts`
- target folder -> `move-root-shortcut-into-folder`

### Root grid reorder behavior

When the recognition point is on the target's reorder side:

- the target yields
- neighboring items get projected away
- the system computes a `reorder-root` intent

The root grid never treats "inside target cell but outside target icon" as a reliable merge signal. The actual merge boundary is the target icon body.

## Claimed Slots, Sticky Projection, And Bridge Regions

This is the stability layer that prevents the grid from flickering between states.

### Claimed reorder intent

Once a reorder has already displaced items, the previous reorder can remain claimed as long as:

- the drag has not returned to the active source icon
- the current session still has projected displacement
- no later target has produced a new valid yielded slot

### Sticky reorder preservation

The grid keeps a previous reorder latched when the recognition point is still effectively traveling through the same claim path, including:

- while still inside the claimed target cell but not on its merge side
- while moving through the inter-target bridge region
- while backing through neutral zones
- while crossing empty gaps before the next valid target actually yields

### Bridge region

The engine constructs directional bridge regions between:

- the active source and the previous yielded target
- the merge target and the previously claimed visual slot

These bridge regions let the visual projection stay stable while the dragged icon travels through otherwise ambiguous space.

This is why the grid no longer falls into:

- merge
- derived reorder
- dead zone
- reorder drops out
- next reorder reappears

That old oscillation is replaced by a latched state machine.

## Entering Folders While A Slot Is Already Claimed

If the drag has already claimed a reorder slot and then enters a folder target:

- `interactionIntent` becomes `move-root-shortcut-into-folder`
- `visualProjectionIntent` stays on the claimed `reorder-root` slot

This rule applies to:

- large folders
- small folders

That means folder entry does not erase the currently claimed visual landing slot unless another valid yield actually replaces it.

## Exiting Merge Targets

If the drag was previously inside a merge target and leaves that icon body through the reorder side:

- the engine synthesizes a reorder intent from the previous merge target
- the projected slot becomes the yielded slot for that target

If the drag leaves through the merge-side edges instead:

- the merge state is not converted into reorder

## Return-Path Rules

Return-path stability is intentional.

Once a target has already yielded, moving back without releasing should not randomly re-merge that same target or a nearby target from the wrong side.

The current behavior contract is:

- a target only re-enters merge when the icon body is entered from its allowed merge side
- returning through reorder-side edges should stay reorder or neutral
- returning through outside edges should not recreate merge just because the pointer is nearby
- previously claimed slots remain visually latched until a new valid yielded slot replaces them or the drag returns to source

This is what makes horizontal and vertical round trips stable.

## Folder Surface Rules

The folder surface intentionally uses reorder-only behavior.

Inside a folder:

- there is no merge-root behavior
- there is no move-into-folder behavior
- there is only reorder plus extraction out of the folder

Still, the same stability principles apply:

- inter-cell gaps should not target unrelated neighbors
- neutral travel should not immediately collapse a previous yield
- the currently yielded slot should stay latched until a later slot truly takes over

Extraction from a folder starts a root drag session and returns to the root-grid engine.

## Variable-Span And Large-Folder Behavior

Large folders are no longer treated as a separate behavior engine. They are items with larger spans inside the same packed reorder model.

Current model:

- every root item participates in one packed layout
- reorder targets are computed from projected packed occupancy
- span-aware reorder is enabled when any item spans multiple rows or columns
- large folders are behaviorally normal items with different `columnSpan` and `rowSpan`

### Small item vs large folder

When dragging a 1x1 item around a multi-span item:

- the multi-span item is treated as a frozen obstacle for slot projection
- the small item may reorder around it
- the small item must not shove the large folder to a new position

### Dragging the large folder itself

When the active item is multi-span:

- it uses the same packed reorder pipeline
- it is not routed into a host-specific special case

## Host Boundary Rule

`LeafTab` must not grow a separate grid behavior branch.

Host apps may own:

- visuals
- preview styling
- item layout inputs
- product policy
- dialogs
- persistence
- thin compatibility wrappers

Host apps must not own:

- drag hit-testing rules
- merge vs reorder state transitions
- bridge logic
- claimed-slot rules
- reorder-only folder state machines
- span-aware reorder behavior

## Tests That Define The Contract

The most important behavior regressions currently live in:

- `packages/grid-react/src/compactRootHover.test.ts`
- `packages/grid-react/src/compactFolderHover.test.ts`
- `packages/grid-react/src/rootShortcutGridHelpers.test.ts`
- `packages/grid-core/src/drag/__tests__/resolveRootDropIntent.test.ts`

If a behavior change is real, these tests and this document should move together.
