# Leaftab Grid Execution Plan

This document is the working execution plan for turning `leaftab-grid` into a stronger open-source product without letting it drift away from the real LeafTab shortcut system.

The plan is intentionally practical. It is meant to guide day-to-day work, not just describe ideals.

## Primary Goal

Build `leaftab-grid` into a high-quality open-source project with its own clear identity:

- desktop-style shortcut grid
- folder-aware interactions
- strong launcher / browser-start-page feel
- better LeafTab alignment over time, not more divergence

## Non-Negotiable Rule

For anything described as `LeafTab-like`, the real LeafTab app remains the reference implementation until the shared preset is stable enough to be consumed back by the app itself.

That means:

- do not invent a second independent "LeafTab style"
- do not let showcase-only decisions become accidental product truth
- do not change the same host behavior independently in both repos without a sync pass

## Working Principles

### 1. Avoid drift first

The project should improve without forking away from the real LeafTab experience.

### 2. Move one layer at a time

Do not change shared behavior, preset rendering, showcase structure, and plugin integration all at once.

### 3. Shared behavior belongs here

If the behavior is reusable, it should live in `leaftab-grid`.

### 4. App-only policy stays in LeafTab

Dialogs, persistence, sync, extension rules, and unrelated UI should stay in the LeafTab app unless there is a strong reason to extract them.

### 5. Every extraction needs proof

An extracted piece should have at least one of:

- a direct showcase use
- a direct plugin use
- a focused test
- a focused host guide entry

## Current Status

These items are already in place:

- `@leaftab/grid-core`
- `@leaftab/grid-react`
- initial `@leaftab/grid-preset-leaftab`
- GitHub Pages showcase consuming the preset layer
- `examples/minimal`
- `examples/leaftab-like`
- `examples/custom-theme`
- rewritten README clarifying repo scope
- host guide documenting how to get closer to LeafTab

This means the project has already moved beyond a simple extraction and now has the beginning of a three-layer public shape:

- `grid-core`
- `grid-react`
- `grid-preset-leaftab`

Recent confidence work now also exists:

- preset geometry and target-region coverage for the LeafTab preset
- ordered local quality gates for core, react, preset, examples, and publishability
- staged CI validation matching the workspace dependency chain
- changelog and lightweight release-process documentation
- a first plugin-convergence helper for shared root-grid preset wiring

## Phase Plan

## Phase 0: Lock The Source Of Truth

Objective:

- prevent future drift before adding more features

Tasks:

1. Create a plugin-vs-preset alignment checklist.
2. Identify the exact LeafTab files that act as the reference for:
   - compact metrics
   - root item layout
   - folder preview visuals
   - icon policy
   - target-region math
   - drag and drop previews
3. Mark which preset parts are already aligned, partially aligned, or still showcase-only.

Done when:

- a written alignment checklist exists in the repo
- every future `LeafTab-like` change has a reference file to compare against

Risk level:

- low

## Phase 1: Converge The LeafTab Preset

Objective:

- make `@leaftab/grid-preset-leaftab` represent the real LeafTab host layer more faithfully

Tasks:

1. Align compact metrics with the plugin.
2. Align root item layout and large-folder sizing with the plugin.
3. Align compact target regions and drop target rects with the plugin.
4. Align folder preview visuals more closely with the plugin.
5. Align drag preview, center preview, and drop preview behavior.
6. Move showcase-specific host logic out of `examples/showcase` where it should become preset logic.

Done when:

- showcase uses preset logic instead of duplicating it locally
- the preset is measurably closer to the plugin in layout and drag feel
- the remaining known differences are documented

Risk level:

- medium

Notes:

- this phase should not change plugin behavior directly
- this phase should still treat LeafTab as the reference implementation

## Phase 2: Strengthen The Showcase

Objective:

- make the public demo a strong proof of capability without turning it into a fork of the app

Tasks:

1. Keep the showcase focused on the grid itself.
2. Ensure the main root-grid area remains the visual priority.
3. Keep the folder panel secondary and explanatory, not dominant.
4. Make the showcase clearly demonstrate:
   - root reorder
   - merge into folder
   - move into existing folder
   - folder reorder
   - extract back to root
   - large-folder placement
5. Keep the showcase explicitly documented as a demo host, not the full LeafTab app.

Done when:

- the showcase is a clean product-quality demonstration of the open-source package layer
- the showcase no longer causes confusion about what is engine vs preset vs full app

Risk level:

- low to medium

## Phase 3: Build Better Examples

Objective:

- make adoption easier for developers who do not want to reverse-engineer the showcase

Tasks:

1. Add `examples/minimal`.
2. Add `examples/leaftab-like`.
3. Add `examples/custom-theme`.
4. Keep each example focused on one adoption path:
   - minimal integration
   - close-to-LeafTab integration
   - heavily customized integration

Done when:

- a new user can choose a starting example without reading the entire codebase first

Risk level:

- low

## Phase 4: Expand Documentation

Objective:

- make the project understandable, credible, and easier to adopt

Tasks:

1. Add a quick-start guide.
2. Add a concepts guide for root grid, folder surface, and drop intents.
3. Add a comparison guide:
   - how this differs from a generic sortable grid
   - how this differs from a dashboard grid
4. Add preset usage documentation.
5. Add a sync guide for keeping LeafTab and `leaftab-grid` aligned.
6. Keep API entrypoints and public contract documentation up to date.

Done when:

- someone unfamiliar with the code can understand what the project is, how it is layered, and how to use it

Risk level:

- low

## Phase 5: Increase Quality And Confidence

Objective:

- make the project feel dependable, not experimental in a sloppy way

Tasks:

1. Expand unit coverage around preset logic.
2. Add focused tests for preset layout resolution and target-region helpers.
3. Keep workspace validation healthy:
   - build
   - typecheck
   - test
   - package publishability
4. Improve CI so the chain is always validated in order:
   - `grid-core`
   - `grid-react`
   - `grid-preset-leaftab`
   - showcase
5. Add changelog and versioning discipline.

Done when:

- releases can be trusted more easily
- regressions are caught earlier

Risk level:

- low to medium

## Phase 6: Plugin Convergence

Objective:

- reduce duplicated LeafTab host logic across the app repo and the open-source repo

Tasks:

1. Decide which preset pieces are stable enough for the plugin to consume.
2. Integrate those preset pieces back into the LeafTab app gradually.
3. Remove duplicated host logic from the plugin only after the shared preset is proven.
4. Keep integration incremental:
   - one area at a time
   - verify behavior after each migration

Done when:

- the plugin begins to consume shared preset code
- duplicate host logic is shrinking instead of growing

Current progress:

- the plugin root-grid wrapper now consumes the shared preset helper layer for layout and drop-resolver wiring
- the plugin folder-surface wrapper now consumes the shared preset helper layer for item-layout wiring
- plugin-owned rendering still remains local on purpose

Risk level:

- medium to high

Notes:

- this is the most sensitive phase
- it must happen only after the preset is reliable enough

## Phase 7: Release And Positioning

Objective:

- turn the repo into a stronger public open-source product

Tasks:

1. Refine repository metadata and public presentation.
2. Improve package descriptions and npm publishing readiness.
3. Decide how to position the project publicly:
   - desktop-style shortcut grid
   - launcher-style host system
   - LeafTab-derived folder-aware grid
4. Decide later whether license strategy should remain unchanged or be revisited.

Done when:

- the project has a sharper public identity
- new users understand its uniqueness quickly

Risk level:

- low

## Immediate Next Actions

These are the next concrete actions to take from this point:

1. Create the plugin-vs-preset alignment checklist.
2. Compare `grid-preset-leaftab` against the real LeafTab host files.
3. Record the current mismatches.
4. Fix the preset in small, verifiable slices:
   - compact metrics
   - folder preview visuals
   - target regions
   - drag/drop previews
5. Keep showcase consuming the preset as each slice improves.

## Risk Management

The main project risk is not raw code complexity. The main risk is drift.

### Highest-risk mistakes

- changing the same host behavior in both repos independently
- letting showcase-only behavior become de facto preset behavior
- modifying shared behavior and plugin integration at the same time
- trying to migrate the plugin before the preset is stable

### Mitigation rules

1. One category at a time.
2. Compare against LeafTab before changing `LeafTab-like` preset behavior.
3. Validate locally after each slice.
4. Keep plugin integration incremental, not all-at-once.
5. Prefer extraction and convergence over reinvention.

## Definition Of Success

This execution plan is succeeding if:

- the open-source project becomes easier to adopt
- the showcase becomes a stronger proof of capability
- `grid-preset-leaftab` gets closer to the real plugin instead of drifting away
- future plugin integration becomes easier, not harder
- the repo develops a clearer identity as a desktop-style shortcut grid system

## What We Should Not Do

Do not do these prematurely:

- rewrite the plugin to use the preset before the preset stabilizes
- generalize the project into a universal drag-and-drop framework
- add nested folders before the current public contract is mature
- build multiple competing `LeafTab-like` implementations
- let the showcase drive core behavior changes without checking the plugin
