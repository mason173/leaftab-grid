# GitHub Pages Showcase

This repository includes a GitHub Pages-ready showcase app in `examples/showcase`.

## What it is

The showcase is a live demo site for the open-source grid packages:

- `@leaftab/grid-core`
- `@leaftab/grid-react`

It is meant to demonstrate the interaction model in a way that is easier to understand than API docs alone:

- root-grid reorder
- merge into folders
- reorder inside folders
- extract folder children back to the root grid
- span-aware layout for larger folder tiles

## Local development

Install dependencies:

```bash
npm install
```

Start the showcase locally:

```bash
npm run showcase:dev
```

Build the showcase:

```bash
npm run showcase:build
```

Preview the built output:

```bash
npm run showcase:preview
```

## GitHub Actions deployment

This repo includes a Pages workflow at `.github/workflows/deploy-pages.yml`.

On every push to `main`, the workflow:

1. installs dependencies
2. builds the grid packages
3. builds `examples/showcase`
4. uploads `examples/showcase/dist`
5. deploys that artifact to GitHub Pages

## GitHub repository settings

In the GitHub repository:

1. Open `Settings`.
2. Open `Pages`.
3. Set the source to `GitHub Actions`.
4. Save the setting if the repository has not already been configured for Actions-based Pages deploys.

After that, pushes to `main` should publish the site automatically.

## Base path

The Vite config for the showcase uses `/leaftab-grid/` as the production base path by default, which matches the standard GitHub Pages URL for this repository:

`https://mason173.github.io/leaftab-grid/`

If you ever deploy the showcase somewhere else, you can override the base path with:

```bash
PAGES_BASE_PATH=/your-base/ npm run showcase:build
```

## Suggested repo presentation

For a cleaner public launch, pair the Pages site with:

- the updated root `README.md`
- the behavior contract in `docs/compact-grid-rules.md`
- direct links back to LeafTab, since this grid system was extracted from that product
