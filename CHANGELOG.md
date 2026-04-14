# Changelog

All notable changes to this project should be recorded in this file.

This repository is still in the `0.1.x alpha` stage, so the public API may continue to evolve. The goal of this changelog is not to pretend the API is already frozen. The goal is to make changes visible and easier to trust.

## [Unreleased]

### Added

- `@leaftab/grid-preset-leaftab` as the current host preset layer.
- `examples/minimal` for the smallest practical integration path.
- `examples/leaftab-like` as the closer-to-LeafTab reference host.
- `examples/custom-theme` as the heavily customized host example.
- geometry and target-region tests for the preset layout helpers.
- shared root-grid and folder-surface preset helpers for LeafTab-like hosts.
- concepts, comparison, quick-start, sync, and host-integration documentation.
- explicit ordered quality scripts and staged CI validation.

### Changed

- narrowed the preset icon strategy to a simpler, more intentional representation instead of chasing the full LeafTab icon pipeline.
- moved the public story of the repo toward three clear layers:
  `grid-core`, `grid-react`, and `grid-preset-leaftab`.
- the real LeafTab app has started consuming selected shared preset wiring back from this repo.

### Notes

- The real LeafTab app remains the reference implementation for anything described as `LeafTab-like`.
- Rich app-only concerns such as dialogs, sync, and the full icon customization pipeline remain outside the public package contract for now.
