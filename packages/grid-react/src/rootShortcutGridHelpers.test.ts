import type { Shortcut } from '@leaftab/grid-core';
import { describe, expect, it } from 'vitest';
import {
  buildProjectedGridItemsForRootReorder,
  buildRootShortcutGridItems,
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
});

describe('buildProjectedGridItemsForRootReorder', () => {
  it('reorders normally when fixed-slot preservation is disabled', () => {
    const items = buildRootShortcutGridItems({
      shortcuts: [createShortcut('a'), createShortcut('b'), createShortcut('c')],
      resolveItemLayout: () => ({ width: 72, height: 96 }),
    });

    const projected = buildProjectedGridItemsForRootReorder({
      items,
      activeSortId: 'a',
      targetIndex: 2,
      preserveFixedSlots: false,
    });

    expect(projected?.map((item) => item.sortId)).toEqual(['b', 'c', 'a']);
  });

  it('keeps preserve-slot items pinned while moving regular items around them', () => {
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
      preserveFixedSlots: true,
    });

    expect(projected?.map((item) => item.sortId)).toEqual([
      'c',
      'folder-large',
      'a',
      'b',
    ]);
  });
});
