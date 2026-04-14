# Release Notes Draft: `v0.2.0-alpha.1`

This draft is intended for the next public GitHub pre-release of `leaftab-grid`.

Suggested release title:

`Leaftab Grid v0.2.0-alpha.1`

Suggested release type:

- GitHub pre-release

## Summary

This alpha introduces the first serious public shape of Leaftab Grid as an open-source shortcut workspace engine.

The repository now has three clear layers:

- `@leaftab/grid-core`
- `@leaftab/grid-react`
- `@leaftab/grid-preset-leaftab`

It also now includes:

- a minimal integration example
- a close-to-LeafTab reference example
- a custom-theme example
- a GitHub Pages showcase
- stronger tests, CI, and release discipline

## Highlights

### New preset package

`@leaftab/grid-preset-leaftab` is now the public host preset layer for teams that want to get closer to the real LeafTab interaction feel without rebuilding every host-side helper from scratch.

Current preset coverage includes:

- compact metrics
- large-folder sizing
- compact target-region helpers
- root-grid preset wiring
- folder-surface preset wiring
- LeafTab-like renderer primitives

### Better adoption paths

The repo now offers clearer entry points depending on what a developer wants:

- `examples/minimal`
  for the smallest practical integration path
- `examples/leaftab-like`
  for a closer-to-LeafTab starting point
- `examples/custom-theme`
  for teams that want the engine but not the LeafTab visual style
- `examples/showcase`
  for the public demo shell and GitHub Pages presentation

### Stronger confidence and release discipline

This alpha also adds:

- ordered quality gates
- staged CI validation
- changelog discipline
- release-process documentation
- preset helper tests around geometry and target-region behavior

## Scope Reminder

This alpha is focused on:

- root shortcut grids
- folder-aware drag and drop
- one folder child level
- reusable behavior and React adapters
- preset helpers, examples, and docs

It does not promise the full LeafTab app surface as part of the public package contract.

That means app-only concerns such as dialogs, persistence, sync, and the richer icon pipeline remain outside the current public API boundary.

## LeafTab Relationship

LeafTab remains the reference implementation for anything described as `LeafTab-like`.

This release is important because the relationship is now starting to work in both directions:

- the open-source preset converges toward the real LeafTab app
- the real LeafTab app has also begun consuming selected shared preset wiring back from this repo

That is the beginning of a healthier long-term sync model instead of two drifting implementations.

## Suggested Release Footer

This is an alpha pre-release. The API and preset surface may continue to evolve, but the goal is already clear: make high-quality, folder-aware shortcut workspace behavior reusable outside the LeafTab app.
