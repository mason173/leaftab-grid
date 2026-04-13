# Snapshot

This directory is the current extraction snapshot copied from the Leaftab repository.

It exists for one reason:

- to keep the real source boundary visible while `Leaftab Grid` is still being separated into standalone packages

What this snapshot is:

- a working source mirror of the current shortcut-grid boundary inside Leaftab
- the reference set for the remaining extraction into `packages/grid-react` and follow-up adapters

What this snapshot is not:

- the final published package layout
- a promise that every file here is already standalone-package quality

What is already extracted:

- `packages/grid-core` now contains the standalone pure logic package for layout, drag, model, and domain behavior

Use the documents in `docs/` to guide the next step:

- `docs/leaftab-grid-open-source-plan.md`
- `docs/leaftab-grid-package-blueprint.md`
- `docs/leaftab-grid-migration-map.md`
