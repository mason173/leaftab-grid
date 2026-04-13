import {
  buildReorderProjectionOffsets,
  type ProjectionOffset,
  type RootShortcutDropIntent,
  type Shortcut,
} from '@leaftab/grid-core';
import { describe, expect, it } from 'vitest';
import {
  resolveCompactRootHoverResolution,
  type CompactTargetRegions,
} from './compactRootHover';

type HoverItem = {
  sortId: string;
  shortcut: Shortcut;
  shortcutIndex: number;
};

const createLink = (id: string, title: string): Shortcut => ({
  id,
  title,
  url: `https://example.com/${id}`,
  icon: '',
  kind: 'link',
});

const createItems = (shortcuts: Shortcut[]): HoverItem[] =>
  shortcuts.map((shortcut, shortcutIndex) => ({
    sortId: shortcut.id,
    shortcut,
    shortcutIndex,
  }));

const createRegions = (cellLeft: number): CompactTargetRegions => ({
  targetCellRegion: {
    left: cellLeft,
    top: 0,
    right: cellLeft + 100,
    bottom: 124,
    width: 100,
    height: 124,
  },
  targetIconRegion: {
    left: cellLeft + 14,
    top: 0,
    right: cellLeft + 86,
    bottom: 72,
    width: 72,
    height: 72,
  },
  targetIconHitRegion: {
    left: cellLeft + 14,
    top: 0,
    right: cellLeft + 86,
    bottom: 72,
    width: 72,
    height: 72,
  },
});

const createProjectionMap = (entries: Array<[string, ProjectionOffset]>) => new Map(entries);

function buildMeasuredItems(items: HoverItem[], regionsById: Record<string, CompactTargetRegions>) {
  return items.map((item) => ({
    ...item,
    rect: {
      x: regionsById[item.sortId].targetCellRegion.left,
      y: 0,
      left: regionsById[item.sortId].targetCellRegion.left,
      top: 0,
      right: regionsById[item.sortId].targetCellRegion.left + 100,
      bottom: 124,
      width: 100,
      height: 124,
      toJSON: () => ({}),
    } as DOMRect,
  }));
}

function buildProjectionOffsetsFromIntent(params: {
  items: HoverItem[];
  measuredItems: Array<HoverItem & { rect: DOMRect }>;
  activeSortId: string;
  intent: RootShortcutDropIntent | null;
}) {
  const { items, measuredItems, activeSortId, intent } = params;
  return buildReorderProjectionOffsets({
    items,
    layoutSnapshot: measuredItems,
    activeId: activeSortId,
    hoveredId: intent?.type === 'reorder-root' ? intent.overShortcutId : null,
    targetIndex: intent?.type === 'reorder-root' ? intent.targetIndex : null,
    getId: (item) => item.sortId,
  });
}

describe('resolveCompactRootHoverResolution', () => {
  it('keeps earlier yielded icons displaced when merging onto a later target', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0),
      b: createRegions(120),
      c: createRegions(240),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousIntent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'after',
    };

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'a',
      recognitionPoint: { x: 260, y: 36 },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: previousIntent,
      interactionProjectionOffsets: createProjectionMap([
        ['b', { x: -120, y: 0 }],
      ]),
      visualProjectionOffsets: createProjectionMap([
        ['b', { x: -120, y: 0 }],
      ]),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual({
      type: 'merge-root-shortcuts',
      activeShortcutId: 'a',
      targetShortcutId: 'c',
    });
    expect(result.visualProjectionIntent).toEqual({
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'c',
      targetIndex: 1,
      edge: 'before',
    });
  });

  it('keeps the previous reorder target sticky while that target is still displaced', () => {
    const items = createItems([
      createLink('a', 'Alpha'),
      createLink('b', 'Beta'),
      createLink('c', 'Gamma'),
    ]);
    const regionsById: Record<string, CompactTargetRegions> = {
      a: createRegions(0),
      b: createRegions(120),
      c: createRegions(240),
    };
    const measuredItems = buildMeasuredItems(items, regionsById);
    const previousIntent: RootShortcutDropIntent = {
      type: 'reorder-root',
      activeShortcutId: 'a',
      overShortcutId: 'b',
      targetIndex: 1,
      edge: 'after',
    };

    const result = resolveCompactRootHoverResolution({
      activeSortId: 'a',
      recognitionPoint: { x: 150, y: 80 },
      measuredItems,
      items,
      previousInteractionIntent: previousIntent,
      previousVisualProjectionIntent: previousIntent,
      interactionProjectionOffsets: buildProjectionOffsetsFromIntent({
        items,
        measuredItems,
        activeSortId: 'a',
        intent: previousIntent,
      }),
      visualProjectionOffsets: buildProjectionOffsetsFromIntent({
        items,
        measuredItems,
        activeSortId: 'a',
        intent: previousIntent,
      }),
      resolveRegions: (item) => regionsById[item.sortId],
      slotIntent: null,
      columnGap: 20,
      rowGap: 20,
    });

    expect(result.interactionIntent).toEqual(previousIntent);
    expect(result.visualProjectionIntent).toEqual(previousIntent);
  });
});
