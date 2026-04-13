import type { Shortcut } from '@leaftab/grid-core';

export type RootShortcutGridItemLayout = {
  width: number;
  height: number;
  previewWidth?: number;
  previewHeight?: number;
  previewOffsetX?: number;
  previewOffsetY?: number;
  previewBorderRadius?: string;
  columnSpan?: number;
  rowSpan?: number;
  preserveSlot?: boolean;
};

export type NormalizedRootShortcutGridItemLayout = {
  width: number;
  height: number;
  previewWidth: number;
  previewHeight: number;
  previewOffsetX: number;
  previewOffsetY: number;
  previewBorderRadius?: string;
  columnSpan: number;
  rowSpan: number;
  preserveSlot: boolean;
};

export type RootShortcutGridItem<TShortcut extends Shortcut = Shortcut> = {
  sortId: string;
  shortcut: TShortcut;
  shortcutIndex: number;
  layout: NormalizedRootShortcutGridItemLayout;
};

export function normalizeRootShortcutGridItemLayout(
  layout: RootShortcutGridItemLayout,
): NormalizedRootShortcutGridItemLayout {
  const width = Math.max(1, layout.width);
  const height = Math.max(1, layout.height);
  const previewWidth = Math.max(1, layout.previewWidth ?? width);
  const previewHeight = Math.max(1, layout.previewHeight ?? height);
  const previewOffsetX = layout.previewOffsetX ?? Math.max(0, (width - previewWidth) / 2);
  const previewOffsetY = layout.previewOffsetY ?? Math.max(0, (height - previewHeight) / 2);

  return {
    width,
    height,
    previewWidth,
    previewHeight,
    previewOffsetX,
    previewOffsetY,
    previewBorderRadius: layout.previewBorderRadius,
    columnSpan: Math.max(1, layout.columnSpan ?? 1),
    rowSpan: Math.max(1, layout.rowSpan ?? 1),
    preserveSlot: Boolean(layout.preserveSlot),
  };
}

export function buildRootShortcutGridItems<TShortcut extends Shortcut>(params: {
  shortcuts: readonly TShortcut[];
  resolveItemLayout: (shortcut: TShortcut) => RootShortcutGridItemLayout;
}): RootShortcutGridItem<TShortcut>[] {
  const { shortcuts, resolveItemLayout } = params;
  const usedIds = new Map<string, number>();

  return shortcuts.map((shortcut, shortcutIndex) => {
    const baseId = (
      shortcut.id
      || `${shortcut.url}::${shortcut.title}`
      || `shortcut-${shortcutIndex}`
    ).trim();
    const duplicateCount = usedIds.get(baseId) ?? 0;
    usedIds.set(baseId, duplicateCount + 1);

    return {
      sortId: duplicateCount === 0 ? baseId : `${baseId}::dup-${duplicateCount}`,
      shortcut,
      shortcutIndex,
      layout: normalizeRootShortcutGridItemLayout(resolveItemLayout(shortcut)),
    };
  });
}

export function buildProjectedGridItemsPreservingFixedSlotsByOrdinal<TShortcut extends Shortcut>(params: {
  items: RootShortcutGridItem<TShortcut>[];
  activeSortId: string;
  targetMovableOrdinal: number;
}): { projectedItems: RootShortcutGridItem<TShortcut>[]; activeFullIndex: number } | null {
  const { items, activeSortId, targetMovableOrdinal } = params;
  const activeItem = items.find((item) => item.sortId === activeSortId);
  if (!activeItem || activeItem.layout.preserveSlot) return null;

  const remainingMovableItems = items.filter(
    (item) => !item.layout.preserveSlot && item.sortId !== activeSortId,
  );
  const clampedOrdinal = Math.max(0, Math.min(targetMovableOrdinal, remainingMovableItems.length));
  const projectedMovableItems = [...remainingMovableItems];
  projectedMovableItems.splice(clampedOrdinal, 0, activeItem);

  let movableCursor = 0;
  let activeFullIndex = -1;
  const projectedItems = items.map((item, index) => {
    if (item.layout.preserveSlot) {
      return item;
    }

    const nextItem = projectedMovableItems[movableCursor];
    if (!nextItem) {
      return item;
    }
    if (nextItem.sortId === activeSortId) {
      activeFullIndex = index;
    }
    movableCursor += 1;
    return nextItem;
  });

  if (projectedItems.some((item) => !item) || activeFullIndex < 0) {
    return null;
  }

  return {
    projectedItems,
    activeFullIndex,
  };
}

export function buildProjectedGridItemsForRootReorder<TShortcut extends Shortcut>(params: {
  items: RootShortcutGridItem<TShortcut>[];
  activeSortId: string;
  targetIndex: number;
  preserveFixedSlots: boolean;
}): RootShortcutGridItem<TShortcut>[] | null {
  const { items, activeSortId, targetIndex, preserveFixedSlots } = params;

  if (!preserveFixedSlots) {
    const activeIndex = items.findIndex((item) => item.sortId === activeSortId);
    if (activeIndex < 0) return null;

    const remainingItems = items.filter((item) => item.sortId !== activeSortId);
    const clampedTargetIndex = Math.max(0, Math.min(targetIndex, remainingItems.length));
    const projectedItems = [...remainingItems];
    projectedItems.splice(clampedTargetIndex, 0, items[activeIndex]);
    return projectedItems;
  }

  const movablePositions = items.flatMap((item, index) => (item.layout.preserveSlot ? [] : [index]));
  if (movablePositions.length === 0) return null;

  const exactMovableOrdinal = movablePositions.indexOf(targetIndex);
  const fallbackMovableOrdinal = movablePositions.filter((position) => position < targetIndex).length;

  return buildProjectedGridItemsPreservingFixedSlotsByOrdinal({
    items,
    activeSortId,
    targetMovableOrdinal: exactMovableOrdinal >= 0 ? exactMovableOrdinal : fallbackMovableOrdinal,
  })?.projectedItems ?? null;
}
