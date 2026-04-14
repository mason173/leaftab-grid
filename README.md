# Leaftab Grid

Folder-aware desktop-style shortcut grid packages extracted from [LeafTab](https://github.com/mason173/LeafTab).

Leaftab Grid is the open-source grid engine behind LeafTab's shortcut surface. It focuses on the interaction model that typical sortable grids stop short of: merge-to-folder behavior, folder extraction back into the root surface, span-aware placement for larger folder tiles, and consistent drag motion between root and folder contexts.

Current release stage: `0.1.x alpha`

## Live Showcase

- GitHub Pages showcase: [mason173.github.io/leaftab-grid](https://mason173.github.io/leaftab-grid/)
- Repository: [github.com/mason173/leaftab-grid](https://github.com/mason173/leaftab-grid)
- Pages deployment guide: [docs/github-pages-showcase.md](./docs/github-pages-showcase.md)
- Repository presentation kit: [docs/repository-presentation.md](./docs/repository-presentation.md)

The Pages demo is built from this repo and showcases:

- root-grid reorder
- merge two shortcuts into a folder
- reorder inside a folder surface
- drag a folder child back into the root grid
- span-aware placement for large folder tiles

## LeafTab Origin

Leaftab Grid was extracted from the production shortcut system inside LeafTab, the browser new-tab extension where these interactions were originally developed and refined.

LeafTab links:

- LeafTab repository: [github.com/mason173/LeafTab](https://github.com/mason173/LeafTab)
- Chrome Web Store: [LeafTab on Chrome Web Store](https://chromewebstore.google.com/detail/leaftab/lfogogokkkpmolbfbklchcbgdiboccdf?hl=zh-CN&gl=DE)
- Edge Add-ons: [LeafTab on Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/leaftab/nfbdmggppgfmfbaddobdhdleppgffphn)
- Firefox Add-ons: [LeafTab on Firefox Add-ons](https://addons.mozilla.org/zh-CN/firefox/addon/leaftab/)

## Why This Repo Exists

Most open-source drag-and-drop grids stop at plain reordering. Leaftab Grid focuses on the desktop-like shortcut behaviors that matter when a host app needs more than a sortable list:

- reorder icons in a true grid
- drag shortcuts into folders
- reorder items inside folders
- extract items back out to the root surface
- preserve consistent drag motion across root and folder contexts
- support span-aware layout behavior for larger folder tiles

## Packages

- `@leaftab/grid-core`
  Pure layout, drag, and domain logic.
- `@leaftab/grid-react`
  React adapters for the root grid, folder surface, and shared drag-motion behavior.

## Scope

The first public contract focuses on:

- root shortcut grids
- folder-aware drag and drop
- one folder child level
- pure layout and drag logic
- React adapters for production-style interactions

Current non-goals:

- nested folder interactions
- application-specific dialogs and persistence flows
- unrelated LeafTab page UI

## Local Development

Install dependencies once:

```bash
npm install
```

Build the packages:

```bash
npm run build
```

Run the GitHub Pages showcase locally:

```bash
npm run showcase:dev
```

Build the GitHub Pages showcase:

```bash
npm run showcase:build
```

Preview the built showcase:

```bash
npm run showcase:preview
```

## Publishing The Showcase

The repository already includes a GitHub Pages workflow:

- Workflow: [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml)
- Guide: [docs/github-pages-showcase.md](./docs/github-pages-showcase.md)

To turn the site on in GitHub, set the repository Pages source to `GitHub Actions`. After that, pushes to `main` will deploy the showcase automatically.

## Validation

Before pushing changes or publishing packages, run:

```bash
npm run verify
```

This runs typecheck, tests, workspace builds, and package publishability checks through `npm pack --dry-run`.

## Development Workflow With LeafTab

To avoid the LeafTab app repo and this package repo drifting apart, use this rule:

> shared grid behavior changes land here first

Practical workflow:

1. Change reusable drag, layout, or adapter behavior in `leaftab-grid`.
2. Run `npm run build` here.
3. Rebuild `LeafTab`, which consumes this repo through local `file:` dependencies during co-development.
4. Only adjust thin host adapters or visuals inside `LeafTab` when the shared package layer is not the right place.

What belongs here:

- drag behavior
- reorder and merge rules
- folder extraction behavior
- grid measurement and layout logic
- reusable React adapters

What should stay in LeafTab:

- card visuals and product styling
- dialogs, toasts, and extension flows
- persistence
- app policy and scenario-specific behavior

## Docs

- Behavior contract: [docs/compact-grid-rules.md](./docs/compact-grid-rules.md)
- GitHub Pages guide: [docs/github-pages-showcase.md](./docs/github-pages-showcase.md)
- Repository presentation kit: [docs/repository-presentation.md](./docs/repository-presentation.md)
- Extraction architecture: [docs/shortcut-grid-extraction-architecture.md](./docs/shortcut-grid-extraction-architecture.md)
- Migration map: [docs/leaftab-grid-migration-map.md](./docs/leaftab-grid-migration-map.md)

## Status

Current repository status:

- `@leaftab/grid-core` is a standalone package with its own source, tests, typecheck, and build pipeline.
- `@leaftab/grid-react` includes reusable `RootShortcutGrid` and `FolderShortcutSurface` adapters plus the shared drag-motion primitives they build on.
- `examples/showcase` powers the GitHub Pages demo for this repo.
- `snapshot/` remains as a reference boundary for the original extraction source.

The current supported interaction model guarantees:

- root shortcuts
- folders with one child level

Nested folders are intentionally outside the first public interaction contract.

## License

GPL-3.0-or-later

This stays aligned with the main LeafTab project license.
