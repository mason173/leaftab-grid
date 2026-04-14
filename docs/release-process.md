# Release Process

This document describes the lightweight release discipline for `leaftab-grid` while the project is still in the `0.1.x alpha` stage.

## Current Versioning Policy

The project currently follows this rule:

- stay in `0.x` while the API is still settling
- only move to `1.0` after the root-grid and folder-surface APIs feel stable enough for external adopters

In practical terms, a `0.x` release may still contain breaking changes, but those changes should be:

- intentional
- documented
- reflected in the changelog and docs

## Before Creating A Release

Run the ordered quality gate:

```bash
npm run quality:ordered
```

This validates the repo in the same dependency order that the workspace is layered:

1. `@leaftab/grid-core`
2. `@leaftab/grid-react`
3. `@leaftab/grid-preset-leaftab`
4. example hosts
5. package publishability

If you only need the all-in-one local gate, you can still run:

```bash
npm run verify
```

## Release Checklist

Before cutting a release tag:

1. Update `CHANGELOG.md` so the upcoming release is clearly described.
2. Confirm README and docs still match the public contract.
3. Run `npm run quality:ordered`.
4. Verify the GitHub Pages showcase still builds.
5. Make sure package versions are intentionally chosen, not bumped casually.

## What Should Trigger A Version Bump

Even in `0.x`, version bumps should still communicate meaning.

Suggested policy:

- patch bump:
  bug fixes, documentation fixes, test-only improvements, non-breaking renderer polish
- minor bump:
  new public helpers, new documented example paths, meaningful behavior additions, or breaking API changes while still in `0.x`

## Changelog Discipline

Every notable user-facing or adopter-facing change should go into `CHANGELOG.md`.

That includes:

- new packages or examples
- public API changes
- behavior contract changes
- important preset convergence work
- documentation that materially improves integration clarity

## Scope Reminder

The release process should reinforce the actual repository scope.

This repo releases:

- grid behavior
- React interaction shells
- preset helpers
- examples and docs

It does not promise the full LeafTab application surface as part of the public package contract.
