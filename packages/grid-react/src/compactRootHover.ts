import {
  distanceToRect,
  distanceToRectCenter,
  getReorderTargetIndex,
  pointInRect,
  resolveRootDropIntent,
  type MeasuredDragItem,
  type ProjectionOffset,
  type PointerPoint,
  type RootShortcutDropIntent,
  type Shortcut,
} from '@leaftab/grid-core';

const COMPACT_DRAG_MATCH_DISTANCE_PX = 64;

export type CompactTargetRegion = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type CompactTargetRegions = {
  targetCellRegion: CompactTargetRegion;
  targetIconRegion: CompactTargetRegion;
  targetIconHitRegion: CompactTargetRegion;
};

export type CompactRootHoverResolution = {
  interactionIntent: RootShortcutDropIntent | null;
  visualProjectionIntent: RootShortcutDropIntent | null;
};

type CompactHoverItem = {
  sortId: string;
  shortcut: Shortcut;
  shortcutIndex: number;
};

type CompactMeasuredItem<TItem extends CompactHoverItem> = MeasuredDragItem<TItem>;

type CompactOverCandidate<TItem extends CompactHoverItem> = {
  overItem: CompactMeasuredItem<TItem>;
  overRect: CompactTargetRegion;
  overCenterRect: CompactTargetRegion;
};

function pointInTargetRegion(point: PointerPoint, rect: CompactTargetRegion): boolean {
  return (
    point.x >= rect.left
    && point.x <= rect.right
    && point.y >= rect.top
    && point.y <= rect.bottom
  );
}

function distanceToTargetRegion(point: PointerPoint, rect: CompactTargetRegion): number {
  const dx = point.x < rect.left ? rect.left - point.x : point.x > rect.right ? point.x - rect.right : 0;
  const dy = point.y < rect.top ? rect.top - point.y : point.y > rect.bottom ? point.y - rect.bottom : 0;
  return Math.hypot(dx, dy);
}

function distanceToTargetRegionCenter(point: PointerPoint, rect: CompactTargetRegion): number {
  return Math.hypot(point.x - (rect.left + rect.width / 2), point.y - (rect.top + rect.height / 2));
}

function isPointInTargetIconRegion(point: PointerPoint, regions: CompactTargetRegions): boolean {
  return pointInTargetRegion(point, regions.targetIconRegion);
}

function isPointInTargetCellReorderRegion(point: PointerPoint, regions: CompactTargetRegions): boolean {
  if (!pointInTargetRegion(point, regions.targetCellRegion) || isPointInTargetIconRegion(point, regions)) {
    return false;
  }

  const iconColumnCorridor: CompactTargetRegion = {
    left: regions.targetIconRegion.left,
    right: regions.targetIconRegion.right,
    top: regions.targetCellRegion.top,
    bottom: regions.targetCellRegion.bottom,
    width: regions.targetIconRegion.width,
    height: regions.targetCellRegion.height,
  };

  return !pointInTargetRegion(point, iconColumnCorridor);
}

function findMeasuredItemByShortcutId<TItem extends CompactHoverItem>(
  measuredItems: CompactMeasuredItem<TItem>[],
  shortcutId: string,
) {
  return measuredItems.find((item) => item.shortcut.id === shortcutId) ?? null;
}

function isShortcutCurrentlyDisplaced(
  projectionOffsets: Map<string, ProjectionOffset>,
  shortcutId: string,
): boolean {
  const projection = projectionOffsets.get(shortcutId);
  if (!projection) return false;

  return Math.abs(projection.x) >= 0.5 || Math.abs(projection.y) >= 0.5;
}

function hasAnyDisplacedShortcut(projectionOffsets: Map<string, ProjectionOffset>): boolean {
  for (const projection of projectionOffsets.values()) {
    if (Math.abs(projection.x) >= 0.5 || Math.abs(projection.y) >= 0.5) {
      return true;
    }
  }

  return false;
}

function isShortcutDisplacedInAnyProjection(params: {
  shortcutId: string;
  interactionProjectionOffsets: Map<string, ProjectionOffset>;
  visualProjectionOffsets: Map<string, ProjectionOffset>;
}): boolean {
  const { shortcutId, interactionProjectionOffsets, visualProjectionOffsets } = params;
  return isShortcutCurrentlyDisplaced(interactionProjectionOffsets, shortcutId)
    || isShortcutCurrentlyDisplaced(visualProjectionOffsets, shortcutId);
}

function pickCompactIconCandidate<TItem extends CompactHoverItem>(params: {
  activeSortId: string;
  measuredItems: CompactMeasuredItem<TItem>[];
  pointer: PointerPoint;
  resolveRegions: (item: CompactMeasuredItem<TItem>) => CompactTargetRegions;
}): CompactOverCandidate<TItem> | null {
  const { activeSortId, measuredItems, pointer, resolveRegions } = params;
  const activeItem = measuredItems.find((item) => item.sortId === activeSortId) ?? null;
  if (activeItem && pointInTargetRegion(pointer, resolveRegions(activeItem).targetIconHitRegion)) {
    return null;
  }

  const directHit = measuredItems
    .filter((item) => item.sortId !== activeSortId)
    .map((item) => {
      const regions = resolveRegions(item);
      return {
        item,
        overRect: regions.targetIconHitRegion,
        overCenterRect: regions.targetIconRegion,
        inside: pointInTargetRegion(pointer, regions.targetIconHitRegion),
        distance: distanceToTargetRegion(pointer, regions.targetIconHitRegion),
        centerDistance: distanceToTargetRegionCenter(pointer, regions.targetIconRegion),
      };
    })
    .filter((candidate) => candidate.inside)
    .sort((left, right) => {
      if (left.centerDistance !== right.centerDistance) return left.centerDistance - right.centerDistance;
      return left.distance - right.distance;
    })[0];

  if (!directHit) return null;

  return {
    overItem: directHit.item,
    overRect: directHit.overRect,
    overCenterRect: directHit.overCenterRect,
  };
}

function pickCompactCellCandidate<TItem extends CompactHoverItem>(params: {
  activeSortId: string;
  measuredItems: CompactMeasuredItem<TItem>[];
  pointer: PointerPoint;
  resolveRegions: (item: CompactMeasuredItem<TItem>) => CompactTargetRegions;
}): CompactOverCandidate<TItem> | null {
  const { activeSortId, measuredItems, pointer, resolveRegions } = params;
  const activeItem = measuredItems.find((item) => item.sortId === activeSortId) ?? null;
  if (activeItem && pointInRect(pointer, activeItem.rect)) {
    return null;
  }

  const directCellHit = measuredItems
    .filter((item) => item.sortId !== activeSortId)
    .map((item) => {
      const regions = resolveRegions(item);
      return {
        item,
        overRect: regions.targetCellRegion,
        overCenterRect: regions.targetIconRegion,
        insideTargetCellNonIconRegion: isPointInTargetCellReorderRegion(pointer, regions),
        centerDistance: distanceToTargetRegionCenter(pointer, regions.targetIconRegion),
      };
    })
    .filter((candidate) => candidate.insideTargetCellNonIconRegion)
    .sort((left, right) => left.centerDistance - right.centerDistance)[0];

  if (!directCellHit) return null;

  return {
    overItem: directCellHit.item,
    overRect: directCellHit.overRect,
    overCenterRect: directCellHit.overCenterRect,
  };
}

function buildCompactVisualProjectionIntent<TItem extends CompactHoverItem>(params: {
  interactionIntent: RootShortcutDropIntent | null;
  previousVisualProjectionIntent: RootShortcutDropIntent | null;
  visualProjectionOffsets: Map<string, ProjectionOffset>;
  items: TItem[];
}): RootShortcutDropIntent | null {
  const { interactionIntent, previousVisualProjectionIntent, visualProjectionOffsets, items } = params;
  if (!interactionIntent) return null;
  if (interactionIntent.type === 'reorder-root') {
    return interactionIntent;
  }

  const hasDisplacedPreviousYield = previousVisualProjectionIntent?.type === 'reorder-root'
    && hasAnyDisplacedShortcut(visualProjectionOffsets);
  if (!hasDisplacedPreviousYield) {
    return null;
  }

  const targetShortcutId = interactionIntent.type === 'merge-root-shortcuts'
    ? interactionIntent.targetShortcutId
    : interactionIntent.targetFolderId;
  const activeItem = items.find((item) => item.shortcut.id === interactionIntent.activeShortcutId);
  const targetItem = items.find((item) => item.shortcut.id === targetShortcutId);
  if (!activeItem || !targetItem) {
    return null;
  }

  const edge = activeItem.shortcutIndex < targetItem.shortcutIndex ? 'before' : 'after';
  return {
    type: 'reorder-root',
    activeShortcutId: interactionIntent.activeShortcutId,
    overShortcutId: targetItem.shortcut.id,
    targetIndex: getReorderTargetIndex(activeItem.shortcutIndex, targetItem.shortcutIndex, edge),
    edge,
  };
}

function resolveStickyVisualReorderIntent<TItem extends CompactHoverItem>(params: {
  previousVisualProjectionIntent: RootShortcutDropIntent | null;
  visualProjectionOffsets: Map<string, ProjectionOffset>;
  measuredItems: CompactMeasuredItem<TItem>[];
  recognitionPoint: PointerPoint;
  resolveRegions: (item: CompactMeasuredItem<TItem>) => CompactTargetRegions;
  columnGap: number;
  rowGap: number;
}): RootShortcutDropIntent | null {
  const {
    previousVisualProjectionIntent,
    visualProjectionOffsets,
    measuredItems,
    recognitionPoint,
    resolveRegions,
    columnGap,
    rowGap,
  } = params;

  if (previousVisualProjectionIntent?.type !== 'reorder-root') return null;
  if (!isShortcutCurrentlyDisplaced(visualProjectionOffsets, previousVisualProjectionIntent.overShortcutId)) {
    return null;
  }

  const previousTarget = findMeasuredItemByShortcutId(measuredItems, previousVisualProjectionIntent.overShortcutId);
  if (!previousTarget) return null;

  const stickyDistanceThresholdPx = Math.max(columnGap, rowGap);
  const distanceToPreviousTargetCell = distanceToTargetRegion(
    recognitionPoint,
    resolveRegions(previousTarget).targetCellRegion,
  );
  if (distanceToPreviousTargetCell > stickyDistanceThresholdPx) return null;

  return previousVisualProjectionIntent;
}

export function resolveCompactRootHoverResolution<TItem extends CompactHoverItem>(params: {
  activeSortId: string;
  recognitionPoint: PointerPoint;
  measuredItems: CompactMeasuredItem<TItem>[];
  items: TItem[];
  previousInteractionIntent: RootShortcutDropIntent | null;
  previousVisualProjectionIntent: RootShortcutDropIntent | null;
  interactionProjectionOffsets: Map<string, ProjectionOffset>;
  visualProjectionOffsets: Map<string, ProjectionOffset>;
  resolveRegions: (item: CompactMeasuredItem<TItem>) => CompactTargetRegions;
  slotIntent?: RootShortcutDropIntent | null;
  columnGap: number;
  rowGap: number;
}): CompactRootHoverResolution {
  const {
    activeSortId,
    recognitionPoint,
    measuredItems,
    items,
    previousInteractionIntent,
    previousVisualProjectionIntent,
    interactionProjectionOffsets,
    visualProjectionOffsets,
    resolveRegions,
    slotIntent = null,
    columnGap,
    rowGap,
  } = params;

  const stickyVisualReorderIntent = resolveStickyVisualReorderIntent({
    previousVisualProjectionIntent,
    visualProjectionOffsets,
    measuredItems,
    recognitionPoint,
    resolveRegions,
    columnGap,
    rowGap,
  });

  const toResolution = (interactionIntent: RootShortcutDropIntent | null): CompactRootHoverResolution => ({
    interactionIntent,
    visualProjectionIntent: buildCompactVisualProjectionIntent({
      interactionIntent,
      previousVisualProjectionIntent,
      visualProjectionOffsets,
      items,
    }) ?? stickyVisualReorderIntent,
  });

  const previousStickyReorderIntent = (() => {
    if (previousInteractionIntent?.type !== 'reorder-root') return null;
    if (!isShortcutDisplacedInAnyProjection({
      shortcutId: previousInteractionIntent.overShortcutId,
      interactionProjectionOffsets,
      visualProjectionOffsets,
    })) {
      return null;
    }

    const previousTarget = findMeasuredItemByShortcutId(measuredItems, previousInteractionIntent.overShortcutId);
    if (!previousTarget) return null;

    const stickyDistanceThresholdPx = Math.max(columnGap, rowGap);
    const distanceToPreviousTargetCell = distanceToTargetRegion(
      recognitionPoint,
      resolveRegions(previousTarget).targetCellRegion,
    );
    if (distanceToPreviousTargetCell > stickyDistanceThresholdPx) return null;

    return previousInteractionIntent;
  })();

  if (previousInteractionIntent?.type === 'reorder-root') {
    const previousTarget = findMeasuredItemByShortcutId(measuredItems, previousInteractionIntent.overShortcutId);
    if (
      previousTarget
      && isShortcutDisplacedInAnyProjection({
        shortcutId: previousInteractionIntent.overShortcutId,
        interactionProjectionOffsets,
        visualProjectionOffsets,
      })
      && pointInTargetRegion(recognitionPoint, resolveRegions(previousTarget).targetCellRegion)
    ) {
      return toResolution(previousInteractionIntent);
    }
  }

  const pointerOverCandidate = pickCompactIconCandidate({
    activeSortId,
    measuredItems,
    pointer: recognitionPoint,
    resolveRegions,
  });
  const pointerRawIntent = pointerOverCandidate
    ? resolveRootDropIntent({
        activeSortId,
        overSortId: pointerOverCandidate.overItem.sortId,
        pointer: recognitionPoint,
        overRect: pointerOverCandidate.overRect,
        overCenterRect: pointerOverCandidate.overCenterRect,
        items,
        centerHitMode: 'full-center-rect',
        allowCenterIntent: !isShortcutDisplacedInAnyProjection({
          shortcutId: pointerOverCandidate.overItem.sortId,
          interactionProjectionOffsets,
          visualProjectionOffsets,
        }),
      })
    : null;

  if (pointerRawIntent && pointerRawIntent.type !== 'reorder-root') {
    return toResolution(pointerRawIntent);
  }

  const compactCellCandidate = pickCompactCellCandidate({
    activeSortId,
    measuredItems,
    pointer: recognitionPoint,
    resolveRegions,
  });
  const overCandidate = pointerOverCandidate ?? compactCellCandidate;
  if (!overCandidate) {
    return toResolution(slotIntent ?? previousStickyReorderIntent);
  }

  const rawIntent = resolveRootDropIntent({
    activeSortId,
    overSortId: overCandidate.overItem.sortId,
    pointer: recognitionPoint,
    overRect: overCandidate.overRect,
    overCenterRect: overCandidate.overCenterRect,
    items,
    centerHitMode: 'full-center-rect',
    allowCenterIntent: !isShortcutDisplacedInAnyProjection({
      shortcutId: overCandidate.overItem.sortId,
      interactionProjectionOffsets,
      visualProjectionOffsets,
    }),
  });
  if (!rawIntent) {
    return toResolution(slotIntent ?? previousStickyReorderIntent);
  }

  if (rawIntent.type === 'reorder-root') {
    if (compactCellCandidate && overCandidate.overItem.sortId === compactCellCandidate.overItem.sortId) {
      return toResolution(rawIntent);
    }

    return toResolution(slotIntent ?? rawIntent);
  }

  return toResolution(rawIntent);
}
