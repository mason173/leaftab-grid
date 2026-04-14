# Shortcut Grid Comparison Guide

This guide explains how `leaftab-grid` differs from other common open-source approaches.

It is not meant to dismiss those tools. It is meant to clarify what problem this repo is actually solving.

## Compared To Generic Sortable Libraries

Examples in this category include libraries that focus on:

- lists
- simple grids
- drag sensors
- reorder primitives

These libraries are excellent building blocks, but they usually stop at the primitive layer.

`leaftab-grid` goes further in a very specific direction.

What `leaftab-grid` adds on top:

- root-grid reorder that behaves like a launcher surface
- merge one shortcut onto another to create a folder
- move a shortcut into an existing folder
- folder extraction back into the root grid
- span-aware packed placement for larger folder tiles
- sticky visual projection across gaps and neutral zones

In short:

- a generic sortable library gives you drag primitives
- `leaftab-grid` gives you a shortcut-surface behavior model

## Compared To Dashboard Grid Libraries

Dashboard grid libraries usually optimize for:

- widgets
- resize handles
- arbitrary panel spans
- dashboard editing

That is a different problem from a compact launcher surface.

What dashboard grids often assume:

- every item is basically a panel
- resize is part of the primary model
- packed movement can feel acceptable even if it is more dashboard-like than icon-like

What `leaftab-grid` assumes instead:

- shortcuts are compact icon cards
- folders are first-class shortcut containers
- merge behavior matters
- extraction matters
- hit regions must feel precise at icon scale

So even though both may use grids and spans, the interaction goals are different.

## Compared To A Full Product Clone

This repo is not trying to publish the entire LeafTab application.

It deliberately focuses on:

- behavior engine
- React interaction shell
- host preset helpers

It deliberately does not try to own:

- dialogs
- persistence policy
- sync
- extension-specific rules
- the full LeafTab icon customization pipeline

That separation is a feature, not a missing piece.

## Why This Matters For Adopters

If you want:

- a low-level drag primitive

choose a generic sortable library.

If you want:

- a dashboard or analytics panel layout

choose a dashboard grid library.

If you want:

- a desktop-like shortcut launcher surface with folders, merge, extraction, and stable compact-grid drag behavior

that is the exact problem `leaftab-grid` is designed to solve.

## Practical Integration Decision

Use `leaftab-grid` when your product needs most of these at the same time:

- compact icon tiles
- folder-aware interactions
- merge on center drop
- extraction from folder back to root
- large-folder or multi-span shortcut items
- stable drag feel across neutral gaps

If you only need plain reorder, `leaftab-grid` may be more specialized than you need.

If you need the launcher-style behavior contract, it will usually save substantial host-side work compared with stitching those rules together yourself.
