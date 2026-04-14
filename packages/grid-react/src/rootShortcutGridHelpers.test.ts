import type { Shortcut } from '@leaftab/workspace-core';
import { describe, expect, it } from 'vitest';
import {
  buildProjectedGridItemsPreservingFrozenSlotsByOrdinal,
  buildProjectedGridItemsForRootReorder,
  buildRootShortcutGridItems,
  resolveFinalHoverIntent,
  shouldSkipLayoutShiftOnAnimationReenable,
} from './rootShortcutGridHelpers';

function createShortcut(id: string, title = id): Shortcut {
  return {
    id,
    title,
    url: `https://${id}.example.com`,
    icon: '',
  };
}

describe('buildRootShortcutGridItems', () => {
  it('generates stable duplicate-safe sort ids', () => {
    const items = buildRootShortcutGridItems({
      shortcuts: [createShortcut('dup'), createShortcut('dup'), createShortcut('unique')],
      resolveItemLayout: () => ({ width: 72, height: 96 }),
    });

    expect(items.map((item) => item.sortId)).toEqual([
      'dup',
      'dup::dup-1',
      'unique',
    ]);
  });

  it('preserves an explicit previewRect on normalized items', () => {
    const [item] = buildRootShortcutGridItems({
      shortcuts: [createShortcut('preview')],
      resolveItemLayout: () => ({
        width: 72,
        height: 96,
        previewRect: {
          left: 0,
          top: 0,
          width: 72,
          height: 72,
          borderRadius: '20px',
        },
      }),
    });

    expect(item.layout.previewOffsetX).toBe(0);
    expect(item.layout.previewOffsetY).toBe(0);
    expect(item.layout.previewRect).toEqual({
      left: 0,
      top: 0,
      width: 72,
      height: 72,
      borderRadius: '20px',
    });
  });
});

describe('buildProjectedGridItemsForRootReorder', () => {
  it('reorders normally in a simple single-span list', () => {
    const items = buildRootShortcutGridItems({
      shortcuts: [createShortcut('a'), createShortcut('b'), createShortcut('c')],
      resolveItemLayout: () => ({ width: 72, height: 96 }),
    });

    const projected = buildProjectedGridItemsForRootReorder({
      items,
      activeSortId: 'a',
      targetIndex: 2,
    });

    expect(projected?.map((item) => item.sortId)).toEqual(['b', 'c', 'a']);
  });

  it('keeps frozen multi-span items pinned while reordering a small item around them', () => {
    const shortcuts = [
      createShortcut('a'),
      createShortcut('folder-large'),
      createShortcut('b'),
      createShortcut('c'),
    ];
    const items = buildRootShortcutGridItems({
      shortcuts,
      resolveItemLayout: (shortcut) => ({
        width: shortcut.id === 'folder-large' ? 160 : 72,
        height: shortcut.id === 'folder-large' ? 160 : 96,
        columnSpan: shortcut.id === 'folder-large' ? 2 : 1,
        rowSpan: shortcut.id === 'folder-large' ? 2 : 1,
        preserveSlot: shortcut.id === 'folder-large',
      }),
    });

    const projected = buildProjectedGridItemsForRootReorder({
      items,
      activeSortId: 'c',
      targetIndex: 0,
      frozenSortIds: new Set(['folder-large']),
    });

    expect(projected?.map((item) => item.sortId)).toEqual([
      'c',
      'folder-large',
      'a',
      'b',
    ]);
  });

  it('can move a multi-span item itself through the same reorder path', () => {
    const shortcuts = [
      createShortcut('a'),
      createShortcut('b'),
      createShortcut('folder-large'),
      createShortcut('c'),
    ];
    const items = buildRootShortcutGridItems({
      shortcuts,
      resolveItemLayout: (shortcut) => ({
        width: shortcut.id === 'folder-large' ? 160 : 72,
        height: shortcut.id === 'folder-large' ? 160 : 96,
        columnSpan: shortcut.id === 'folder-large' ? 2 : 1,
        rowSpan: shortcut.id === 'folder-large' ? 2 : 1,
      }),
    });

    const projected = buildProjectedGridItemsForRootReorder({
      items,
      activeSortId: 'folder-large',
      targetIndex: 0,
    });

    expect(projected?.map((item) => item.sortId)).toEqual([
      'folder-large',
      'a',
      'b',
      'c',
    ]);
  });

  it('maps movable ordinals back onto the full list when frozen slots exist', () => {
    const shortcuts = [
      createShortcut('a'),
      createShortcut('folder-large'),
      createShortcut('b'),
      createShortcut('c'),
    ];
    const items = buildRootShortcutGridItems({
      shortcuts,
      resolveItemLayout: (shortcut) => ({
        width: shortcut.id === 'folder-large' ? 160 : 72,
        height: shortcut.id === 'folder-large' ? 160 : 96,
        columnSpan: shortcut.id === 'folder-large' ? 2 : 1,
        rowSpan: shortcut.id === 'folder-large' ? 2 : 1,
      }),
    });

    const projected = buildProjectedGridItemsPreservingFrozenSlotsByOrdinal({
      items,
      activeSortId: 'c',
      targetMovableOrdinal: 0,
      frozenSortIds: new Set(['folder-large']),
    });

    expect(projected?.activeFullIndex).toBe(0);
    expect(projected?.projectedItems.map((item) => item.sortId)).toEqual([
      'c',
      'folder-large',
      'a',
      'b',
    ]);
  });
});

describe('shouldSkipLayoutShiftOnAnimationReenable', () => {
  it('skips the first layout-shift commit after animation is re-enabled', () => {
    expect(shouldSkipLayoutShiftOnAnimationReenable({
      previousAnimationDisabled: true,
      animationDisabled: false,
    })).toBe(true);
  });

  it('does not skip while animation remains disabled or was already enabled', () => {
    expect(shouldSkipLayoutShiftOnAnimationReenable({
      previousAnimationDisabled: true,
      animationDisabled: true,
    })).toBe(false);
    expect(shouldSkipLayoutShiftOnAnimationReenable({
      previousAnimationDisabled: false,
      animationDisabled: false,
    })).toBe(false);
  });
});

describe('resolveFinalHoverIntent', () => {
  it('prefers the interaction intent when one is still active', () => {
    expect(resolveFinalHoverIntent({
      interactionIntent: 'merge',
      visualProjectionIntent: 'reorder',
    })).toBe('merge');
  });

  it('falls back to the current visual projection when interaction intent is empty', () => {
    expect(resolveFinalHoverIntent({
      interactionIntent: null,
      visualProjectionIntent: 'reorder',
    })).toBe('reorder');
  });

  it('returns null when neither interaction nor visual projection is active', () => {
    expect(resolveFinalHoverIntent({
      interactionIntent: null,
      visualProjectionIntent: null,
    })).toBeNull();
  });
});
