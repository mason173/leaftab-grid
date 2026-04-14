import type { Shortcut } from '@leaftab/workspace-core';
import { normalizePreviewGeometry, type GridPreviewRect } from './previewGeometry';

export type RootShortcutGridItemLayout = {
  width: number;
  height: number;
  previewWidth?: number;
  previewHeight?: number;
  previewOffsetX?: number;
  previewOffsetY?: number;
  previewBorderRadius?: string;
  previewRect?: GridPreviewRect;
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
  previewRect: GridPreviewRect;
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
  const previewGeometry = normalizePreviewGeometry({
    width,
    height,
    previewWidth: layout.previewWidth,
    previewHeight: layout.previewHeight,
    previewOffsetX: layout.previewOffsetX,
    previewOffsetY: layout.previewOffsetY,
    previewBorderRadius: layout.previewBorderRadius,
    previewRect: layout.previewRect,
  });

  return {
    width,
    height,
    previewWidth: previewGeometry.previewWidth,
    previewHeight: previewGeometry.previewHeight,
    previewOffsetX: previewGeometry.previewOffsetX,
    previewOffsetY: previewGeometry.previewOffsetY,
    previewBorderRadius: previewGeometry.previewBorderRadius,
    previewRect: previewGeometry.previewRect,
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

export function buildProjectedGridItemsPreservingFrozenSlotsByOrdinal<TShortcut extends Shortcut>(params: {
  items: RootShortcutGridItem<TShortcut>[];
  activeSortId: string;
  targetMovableOrdinal: number;
  frozenSortIds: ReadonlySet<string>;
}): { projectedItems: RootShortcutGridItem<TShortcut>[]; activeFullIndex: number } | null {
  const { items, activeSortId, targetMovableOrdinal, frozenSortIds } = params;
  const activeItem = items.find((item) => item.sortId === activeSortId);
  if (!activeItem || frozenSortIds.has(activeSortId)) return null;

  const remainingMovableItems = items.filter(
    (item) => !frozenSortIds.has(item.sortId) && item.sortId !== activeSortId,
  );
  const clampedOrdinal = Math.max(0, Math.min(targetMovableOrdinal, remainingMovableItems.length));
  const projectedMovableItems = [...remainingMovableItems];
  projectedMovableItems.splice(clampedOrdinal, 0, activeItem);

  let movableCursor = 0;
  let activeFullIndex = -1;
  const projectedItems = items.map((item, index) => {
    if (frozenSortIds.has(item.sortId)) {
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
  frozenSortIds?: ReadonlySet<string> | null;
}): RootShortcutGridItem<TShortcut>[] | null {
  const { items, activeSortId, targetIndex, frozenSortIds } = params;
  if (frozenSortIds && frozenSortIds.size > 0) {
    const movablePositions = items.flatMap((item, index) => (frozenSortIds.has(item.sortId) ? [] : [index]));
    if (movablePositions.length === 0) return null;

    const exactMovableOrdinal = movablePositions.indexOf(targetIndex);
    const fallbackMovableOrdinal = movablePositions.filter((position) => position < targetIndex).length;

    return buildProjectedGridItemsPreservingFrozenSlotsByOrdinal({
      items,
      activeSortId,
      targetMovableOrdinal: exactMovableOrdinal >= 0 ? exactMovableOrdinal : fallbackMovableOrdinal,
      frozenSortIds,
    })?.projectedItems ?? null;
  }

  const activeIndex = items.findIndex((item) => item.sortId === activeSortId);
  if (activeIndex < 0) return null;

  const remainingItems = items.filter((item) => item.sortId !== activeSortId);
  const clampedTargetIndex = Math.max(0, Math.min(targetIndex, remainingItems.length));
  const projectedItems = [...remainingItems];
  projectedItems.splice(clampedTargetIndex, 0, items[activeIndex]);
  return projectedItems;
}

export function shouldSkipLayoutShiftOnAnimationReenable(params: {
  previousAnimationDisabled: boolean;
  animationDisabled: boolean;
}): boolean {
  const { previousAnimationDisabled, animationDisabled } = params;
  return previousAnimationDisabled && !animationDisabled;
}

export function resolveFinalHoverIntent<TIntent>(resolution: {
  interactionIntent: TIntent | null;
  visualProjectionIntent: TIntent | null;
}): TIntent | null {
  return resolution.interactionIntent ?? resolution.visualProjectionIntent;
}
