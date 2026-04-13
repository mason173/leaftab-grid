import {
  buildDragAnchor,
  buildPreviewOffsetFromPointer,
  buildReorderProjectionOffsets as buildSharedReorderProjectionOffsets,
  combineProjectionOffsets,
  getDragVisualCenter,
  getDropEdge,
  getReorderTargetIndex,
  hasPointerDragActivated,
  measureDragItemRects,
  measureDragItems,
  pickClosestMeasuredItem,
  pointInRect,
  type ActivePointerDragState,
  type FolderExtractDragStartPayload,
  type FolderShortcutDropIntent,
  type PendingPointerDragState,
  type PointerPoint,
  type ProjectionOffset,
  type RootDropEdge,
  type Shortcut,
} from '@leaftab/grid-core';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GridDragItemFrame } from './GridDragItemFrame';
import { useDragMotionState } from './useDragMotionState';

const DRAG_MATCH_DISTANCE_PX = 72;
const EXTRACT_HANDOFF_DELAY_MS = 520;
const DRAG_OVERLAY_Z_INDEX = 2147483000;
const LAYOUT_SHIFT_MIN_DISTANCE_PX = 0.5;
const DRAG_RELEASE_SETTLE_DURATION_MS = 220;

type FolderHoverState =
  | { type: 'item'; shortcutId: string; edge: Exclude<RootDropEdge, 'center'> }
  | { type: 'mask' }
  | null;

type PendingDragState = PendingPointerDragState<string> & {
  activeShortcutId: string;
  activeShortcutIndex: number;
};

type DragSessionState = ActivePointerDragState<string> & {
  activeShortcutId: string;
  activeShortcutIndex: number;
};

type FolderItemLayout = {
  width: number;
  height: number;
  previewWidth: number;
  previewHeight: number;
  previewOffsetX: number;
  previewOffsetY: number;
  previewBorderRadius?: string;
};

type MeasuredFolderItem = {
  shortcut: Shortcut;
  shortcutIndex: number;
  layout: FolderItemLayout;
  rect: DOMRect;
};

type FolderProjectedDropPreview = {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius?: string;
};

export type FolderShortcutSurfaceItemLayout = {
  width: number;
  height: number;
  previewWidth?: number;
  previewHeight?: number;
  previewOffsetX?: number;
  previewOffsetY?: number;
  previewBorderRadius?: string;
};

export type FolderShortcutSurfaceRenderItemParams = {
  shortcut: Shortcut;
  shortcutIndex: number;
  isDragging: boolean;
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
};

export type FolderShortcutSurfaceRenderDragPreviewParams = {
  shortcut: Shortcut;
  shortcutIndex: number;
};

export type FolderShortcutSurfaceRenderDropPreviewParams = FolderProjectedDropPreview;

export interface FolderShortcutSurfaceProps {
  folderId: string;
  shortcuts: Shortcut[];
  emptyText?: string;
  renderEmptyState?: () => React.ReactNode;
  columns?: number;
  columnGap?: number;
  rowGap?: number;
  overlayZIndex?: number;
  maskBoundaryRef: React.RefObject<HTMLElement | null>;
  resolveItemLayout: (shortcut: Shortcut) => FolderShortcutSurfaceItemLayout;
  renderItem: (params: FolderShortcutSurfaceRenderItemParams) => React.ReactNode;
  renderDragPreview: (params: FolderShortcutSurfaceRenderDragPreviewParams) => React.ReactNode;
  renderDropPreview?: (params: FolderShortcutSurfaceRenderDropPreviewParams) => React.ReactNode;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu?: (event: React.MouseEvent<HTMLDivElement>, shortcut: Shortcut) => void;
  onShortcutDropIntent: (intent: FolderShortcutDropIntent) => void;
  onExtractDragStart?: (payload: FolderExtractDragStartPayload) => void;
  onDragActiveChange?: (active: boolean) => void;
  isFirefox?: boolean;
}

function detectFirefox() {
  return typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
}

function normalizeItemLayout(layout: FolderShortcutSurfaceItemLayout): FolderItemLayout {
  const width = Math.max(1, layout.width);
  const height = Math.max(1, layout.height);
  const previewWidth = Math.max(1, layout.previewWidth ?? width);
  const previewHeight = Math.max(1, layout.previewHeight ?? height);
  return {
    width,
    height,
    previewWidth,
    previewHeight,
    previewOffsetX: layout.previewOffsetX ?? Math.max(0, (width - previewWidth) / 2),
    previewOffsetY: layout.previewOffsetY ?? Math.max(0, (height - previewHeight) / 2),
    previewBorderRadius: layout.previewBorderRadius,
  };
}

function buildDefaultPlaceholder(layout: FolderItemLayout) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none border-2 border-dashed border-current/25 bg-current/5"
      style={{
        width: layout.width,
        height: layout.height,
        margin: '0 auto',
        borderRadius: layout.previewBorderRadius ?? '18px',
      }}
    />
  );
}

function renderDefaultDropPreview(params: FolderShortcutSurfaceRenderDropPreviewParams) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-0 bg-black/10"
      style={{
        left: params.left,
        top: params.top,
        width: params.width,
        height: params.height,
        borderRadius: params.borderRadius ?? '18px',
      }}
    />
  );
}

function buildMeasuredItems(
  shortcuts: Shortcut[],
  resolveItemLayout: (shortcut: Shortcut) => FolderShortcutSurfaceItemLayout,
) {
  return shortcuts.map((shortcut, shortcutIndex) => ({
    shortcut,
    shortcutIndex,
    layout: normalizeItemLayout(resolveItemLayout(shortcut)),
  }));
}

function measureFolderItems(
  items: Array<{ shortcut: Shortcut; shortcutIndex: number; layout: FolderItemLayout }>,
  itemElements: Map<string, HTMLDivElement>,
): MeasuredFolderItem[] {
  return measureDragItems({
    items,
    itemElements,
    getId: (item) => item.shortcut.id,
  });
}

function buildReorderProjectionOffsets(params: {
  shortcuts: Shortcut[];
  layoutSnapshot: MeasuredFolderItem[] | null;
  activeShortcutId: string | null;
  hoverState: FolderHoverState;
}): Map<string, ProjectionOffset> {
  const { shortcuts, layoutSnapshot, activeShortcutId, hoverState } = params;
  if (hoverState?.type !== 'item') {
    return new Map<string, ProjectionOffset>();
  }

  const items = shortcuts.map((shortcut, shortcutIndex) => ({ shortcut, shortcutIndex }));
  const activeIndex = shortcuts.findIndex((shortcut) => shortcut.id === activeShortcutId);
  const overIndex = shortcuts.findIndex((shortcut) => shortcut.id === hoverState.shortcutId);
  const targetIndex = activeIndex < 0 || overIndex < 0
    ? null
    : getReorderTargetIndex(activeIndex, overIndex, hoverState.edge);

  return buildSharedReorderProjectionOffsets({
    items,
    layoutSnapshot,
    activeId: activeShortcutId,
    hoveredId: hoverState.shortcutId,
    targetIndex,
    getId: (item) => item.shortcut.id,
  });
}

function buildProjectedDropPreview(params: {
  shortcuts: Shortcut[];
  measuredItems: Array<{ shortcut: Shortcut; shortcutIndex: number; layout: FolderItemLayout }>;
  layoutSnapshot: MeasuredFolderItem[] | null;
  activeShortcutId: string | null;
  hoverState: FolderHoverState;
  rootElement: HTMLDivElement | null;
}): FolderProjectedDropPreview | null {
  const {
    shortcuts,
    measuredItems,
    layoutSnapshot,
    activeShortcutId,
    hoverState,
    rootElement,
  } = params;

  if (!layoutSnapshot || !activeShortcutId || !rootElement || hoverState?.type === 'mask') {
    return null;
  }

  const activeItem = measuredItems.find((item) => item.shortcut.id === activeShortcutId);
  if (!activeItem) return null;

  const snapshotById = new Map(layoutSnapshot.map((item) => [item.shortcut.id, item.rect]));
  const activeSnapshot = snapshotById.get(activeShortcutId);
  if (!activeSnapshot) return null;

  const targetRect = hoverState?.type === 'item'
    ? snapshotById.get(hoverState.shortcutId) ?? activeSnapshot
    : activeSnapshot;
  const rootRect = rootElement.getBoundingClientRect();

  return {
    left: targetRect.left - rootRect.left + activeItem.layout.previewOffsetX,
    top: targetRect.top - rootRect.top + activeItem.layout.previewOffsetY,
    width: activeItem.layout.previewWidth,
    height: activeItem.layout.previewHeight,
    borderRadius: activeItem.layout.previewBorderRadius,
  };
}

function buildProjectedDragSettleTarget(params: {
  shortcuts: Shortcut[];
  layoutSnapshot: MeasuredFolderItem[] | null;
  activeShortcutId: string | null;
  hoverState: FolderHoverState;
}): { left: number; top: number } | null {
  const { shortcuts, layoutSnapshot, activeShortcutId, hoverState } = params;
  if (!layoutSnapshot || !activeShortcutId) return null;

  const activeIndex = shortcuts.findIndex((shortcut) => shortcut.id === activeShortcutId);
  const activeSnapshot = layoutSnapshot.find((item) => item.shortcut.id === activeShortcutId)?.rect ?? null;
  if (activeIndex < 0 || !activeSnapshot) return null;

  if (!hoverState || hoverState.type === 'mask') {
    return {
      left: activeSnapshot.left,
      top: activeSnapshot.top,
    };
  }

  const targetShortcutIndex = shortcuts.findIndex((shortcut) => shortcut.id === hoverState.shortcutId);
  if (targetShortcutIndex < 0) {
    return {
      left: activeSnapshot.left,
      top: activeSnapshot.top,
    };
  }

  const targetIndex = getReorderTargetIndex(activeIndex, targetShortcutIndex, hoverState.edge);
  const orderedRects = shortcuts
    .map((shortcut) => layoutSnapshot.find((item) => item.shortcut.id === shortcut.id)?.rect ?? null)
    .filter((rect): rect is DOMRect => Boolean(rect));
  if (orderedRects.length === 0) return null;

  const targetRect = orderedRects[Math.max(0, Math.min(targetIndex, orderedRects.length - 1))] ?? activeSnapshot;
  return {
    left: targetRect.left,
    top: targetRect.top,
  };
}

function pickOverItem(params: {
  activeShortcutId: string;
  measuredItems: MeasuredFolderItem[];
  pointer: PointerPoint;
}): MeasuredFolderItem | null {
  const { activeShortcutId, measuredItems, pointer } = params;
  return pickClosestMeasuredItem({
    activeId: activeShortcutId,
    measuredItems,
    pointer,
    getId: (item) => item.shortcut.id,
    maxDistance: DRAG_MATCH_DISTANCE_PX,
  });
}

function FolderMaskDropZones({
  active,
  hovered,
  boundaryRef,
}: {
  active: boolean;
  hovered: boolean;
  boundaryRef: React.RefObject<HTMLElement | null>;
}) {
  const [boundaryRect, setBoundaryRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!active) {
      setBoundaryRect(null);
      return;
    }

    const updateRect = () => {
      const node = boundaryRef.current;
      setBoundaryRect(node ? node.getBoundingClientRect() : null);
    };

    updateRect();
    window.addEventListener('resize', updateRect, { passive: true });
    window.addEventListener('scroll', updateRect, { passive: true, capture: true });

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [active, boundaryRef]);

  if (!active || !boundaryRect || typeof document === 'undefined') return null;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const zoneClassName = hovered ? 'bg-black/10' : 'bg-black/5';

  return createPortal(
    <>
      <div className={`pointer-events-none fixed left-0 top-0 z-[51] transition-colors ${zoneClassName}`} style={{ width: viewportWidth, height: Math.max(0, boundaryRect.top) }} />
      <div className={`pointer-events-none fixed z-[51] transition-colors ${zoneClassName}`} style={{ left: Math.max(0, boundaryRect.right), top: Math.max(0, boundaryRect.top), width: Math.max(0, viewportWidth - boundaryRect.right), height: Math.max(0, boundaryRect.height) }} />
      <div className={`pointer-events-none fixed left-0 z-[51] transition-colors ${zoneClassName}`} style={{ top: Math.max(0, boundaryRect.bottom), width: viewportWidth, height: Math.max(0, viewportHeight - boundaryRect.bottom) }} />
      <div className={`pointer-events-none fixed z-[51] transition-colors ${zoneClassName}`} style={{ left: 0, top: Math.max(0, boundaryRect.top), width: Math.max(0, boundaryRect.left), height: Math.max(0, boundaryRect.height) }} />
    </>,
    document.body,
  );
}

export function FolderShortcutSurface({
  folderId,
  shortcuts,
  emptyText = '',
  renderEmptyState,
  columns = 3,
  columnGap = 16,
  rowGap = 20,
  overlayZIndex = DRAG_OVERLAY_Z_INDEX,
  maskBoundaryRef,
  resolveItemLayout,
  renderItem,
  renderDragPreview,
  renderDropPreview = renderDefaultDropPreview,
  onShortcutOpen,
  onShortcutContextMenu,
  onShortcutDropIntent,
  onExtractDragStart,
  onDragActiveChange,
  isFirefox = detectFirefox(),
}: FolderShortcutSurfaceProps) {
  const measuredItems = useMemo(
    () => buildMeasuredItems(shortcuts, resolveItemLayout),
    [resolveItemLayout, shortcuts],
  );
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragPointer, setDragPointer] = useState<PointerPoint | null>(null);
  const [dragPreviewOffset, setDragPreviewOffset] = useState<PointerPoint | null>(null);
  const [hoverState, setHoverState] = useState<FolderHoverState>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemElementsRef = useRef(new Map<string, HTMLDivElement>());
  const ignoreClickRef = useRef(false);
  const pendingDragRef = useRef<PendingDragState | null>(null);
  const dragSessionRef = useRef<DragSessionState | null>(null);
  const latestHoverStateRef = useRef<FolderHoverState>(null);
  const extractHandoffTimerRef = useRef<number | null>(null);
  const latestPointerRef = useRef<PointerPoint | null>(null);
  const projectionSettleResumeRafRef = useRef<number | null>(null);
  const [dragLayoutSnapshot, setDragLayoutSnapshot] = useState<MeasuredFolderItem[] | null>(null);
  const [suppressProjectionSettleAnimation, setSuppressProjectionSettleAnimation] = useState(false);

  const {
    layoutShiftOffsets,
    disableLayoutShiftTransition,
    dragSettlePreview,
    commitMeasuredItemRects,
    startDragSettlePreview,
    clearDragSettlePreview,
  } = useDragMotionState<Shortcut>({
    minLayoutShiftDistancePx: LAYOUT_SHIFT_MIN_DISTANCE_PX,
    settleDurationMs: DRAG_RELEASE_SETTLE_DURATION_MS,
  });

  const activeDragItem = useMemo(
    () => measuredItems.find((item) => item.shortcut.id === activeDragId) ?? null,
    [activeDragId, measuredItems],
  );

  const projectionOffsets = useMemo(
    () => buildReorderProjectionOffsets({
      shortcuts,
      layoutSnapshot: dragLayoutSnapshot,
      activeShortcutId: activeDragId,
      hoverState,
    }),
    [activeDragId, dragLayoutSnapshot, hoverState, shortcuts],
  );
  const projectedDropPreview = useMemo(() => buildProjectedDropPreview({
    shortcuts,
    measuredItems,
    layoutSnapshot: dragLayoutSnapshot,
    activeShortcutId: activeDragId,
    hoverState,
    rootElement: rootRef.current,
  }), [
    activeDragId,
    dragLayoutSnapshot,
    hoverState,
    measuredItems,
    shortcuts,
  ]);
  const hiddenShortcutId = activeDragId ?? dragSettlePreview?.itemId ?? null;

  useEffect(() => {
    latestHoverStateRef.current = hoverState;
  }, [hoverState]);

  useEffect(() => {
    if (!activeDragId) {
      window.setTimeout(() => {
        ignoreClickRef.current = false;
      }, 120);
      onDragActiveChange?.(false);
      return;
    }

    ignoreClickRef.current = true;
    onDragActiveChange?.(true);
  }, [activeDragId, onDragActiveChange]);

  const clearDragState = useCallback(() => {
    if (extractHandoffTimerRef.current !== null) {
      window.clearTimeout(extractHandoffTimerRef.current);
      extractHandoffTimerRef.current = null;
    }
    pendingDragRef.current = null;
    dragSessionRef.current = null;
    latestPointerRef.current = null;
    setActiveDragId(null);
    setDragPointer(null);
    setDragPreviewOffset(null);
    setDragLayoutSnapshot(null);
    setHoverState(null);
    document.body.style.userSelect = '';
  }, []);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    commitMeasuredItemRects({
      currentRects: measureDragItemRects(itemElementsRef.current),
      skip: Boolean(activeDragId) || suppressProjectionSettleAnimation,
    });
  }, [activeDragId, commitMeasuredItemRects, measuredItems, suppressProjectionSettleAnimation]);

  const armProjectionSettleSuppression = useCallback(() => {
    if (projectionSettleResumeRafRef.current !== null) {
      window.cancelAnimationFrame(projectionSettleResumeRafRef.current);
      projectionSettleResumeRafRef.current = null;
    }

    setSuppressProjectionSettleAnimation(true);
    const firstFrame = window.requestAnimationFrame(() => {
      projectionSettleResumeRafRef.current = window.requestAnimationFrame(() => {
        projectionSettleResumeRafRef.current = null;
        setSuppressProjectionSettleAnimation(false);
      });
    });
    projectionSettleResumeRafRef.current = firstFrame;
  }, []);

  const performExtractHandoff = useCallback((pointer: PointerPoint) => {
    const session = dragSessionRef.current;
    if (!session) return;

    const activeItem = (dragLayoutSnapshot ?? measureFolderItems(measuredItems, itemElementsRef.current))
      .find((item) => item.shortcut.id === session.activeShortcutId);
    if (!activeItem) return;

    const anchor = buildDragAnchor({
      rect: activeItem.rect,
      previewOffset: session.previewOffset,
    });

    clearDragState();
    onExtractDragStart?.({
      folderId,
      shortcutId: activeItem.shortcut.id,
      pointerId: session.pointerId,
      pointerType: session.pointerType,
      pointer,
      anchor,
    });
  }, [clearDragState, dragLayoutSnapshot, folderId, measuredItems, onExtractDragStart]);

  const clearExtractHandoffTimer = useCallback(() => {
    if (extractHandoffTimerRef.current !== null) {
      window.clearTimeout(extractHandoffTimerRef.current);
      extractHandoffTimerRef.current = null;
    }
  }, []);

  const ensureExtractHandoffTimer = useCallback(() => {
    if (extractHandoffTimerRef.current !== null) return;

    extractHandoffTimerRef.current = window.setTimeout(() => {
      extractHandoffTimerRef.current = null;
      const pointer = latestPointerRef.current;
      if (pointer) {
        performExtractHandoff(pointer);
      }
    }, EXTRACT_HANDOFF_DELAY_MS);
  }, [performExtractHandoff]);

  const resolveHoverState = useCallback((pointer: PointerPoint): FolderHoverState => {
    const session = dragSessionRef.current;
    if (!session) return null;

    latestPointerRef.current = pointer;
    const snapshot = dragLayoutSnapshot ?? measureFolderItems(measuredItems, itemElementsRef.current);
    const activeItem = snapshot.find((item) => item.shortcut.id === session.activeShortcutId);
    if (!activeItem) return null;

    const recognitionPoint = getDragVisualCenter({
      pointer,
      previewOffset: session.previewOffset,
      activeRect: activeItem.rect,
      visualRect: {
        offsetX: activeItem.layout.previewOffsetX,
        offsetY: activeItem.layout.previewOffsetY,
        width: activeItem.layout.previewWidth,
        height: activeItem.layout.previewHeight,
      },
    });

    const boundaryRect = maskBoundaryRef.current?.getBoundingClientRect() ?? null;
    if (boundaryRect && !pointInRect(recognitionPoint, boundaryRect)) {
      ensureExtractHandoffTimer();
      return { type: 'mask' };
    }

    clearExtractHandoffTimer();
    const overItem = pickOverItem({
      activeShortcutId: session.activeShortcutId,
      measuredItems: snapshot,
      pointer: recognitionPoint,
    });
    if (!overItem) return null;

    const edge = getDropEdge(recognitionPoint, overItem.rect);
    return {
      type: 'item',
      shortcutId: overItem.shortcut.id,
      edge: edge === 'center' ? 'after' : edge,
    };
  }, [
    clearExtractHandoffTimer,
    dragLayoutSnapshot,
    ensureExtractHandoffTimer,
    maskBoundaryRef,
    measuredItems,
  ]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const pending = pendingDragRef.current;
      const session = dragSessionRef.current;

      if (pending && event.pointerId === pending.pointerId) {
        const pointer = { x: event.clientX, y: event.clientY };
        if (!hasPointerDragActivated({
          origin: pending.origin,
          pointer,
        })) {
          return;
        }

        const nextSession: DragSessionState = {
          pointerId: pending.pointerId,
          pointerType: pending.pointerType,
          activeId: pending.activeShortcutId,
          activeShortcutId: pending.activeShortcutId,
          activeShortcutIndex: pending.activeShortcutIndex,
          pointer,
          previewOffset: pending.previewOffset,
        };
        dragSessionRef.current = nextSession;
        pendingDragRef.current = null;
        setDragLayoutSnapshot(measureFolderItems(measuredItems, itemElementsRef.current));
        document.body.style.userSelect = 'none';
        setActiveDragId(nextSession.activeShortcutId);
        setDragPreviewOffset(nextSession.previewOffset);
        setDragPointer(pointer);
        setHoverState(resolveHoverState(pointer));
        event.preventDefault();
        return;
      }

      if (!session || event.pointerId !== session.pointerId) return;

      const pointer = { x: event.clientX, y: event.clientY };
      session.pointer = pointer;
      setDragPointer(pointer);
      setHoverState(resolveHoverState(pointer));
      event.preventDefault();
    };

    const handlePointerEnd = (event: PointerEvent) => {
      const pending = pendingDragRef.current;
      const session = dragSessionRef.current;
      if (pending && event.pointerId === pending.pointerId) {
        pendingDragRef.current = null;
        return;
      }
      if (!session || event.pointerId !== session.pointerId) return;

      const finalHoverState = latestHoverStateRef.current;
      const activeShortcutId = session.activeShortcutId;
      const activeShortcutIndex = session.activeShortcutIndex;
      const dragReleasePreview = (() => {
        const activeItem = measuredItems.find((item) => item.shortcut.id === activeShortcutId) ?? null;
        const target = buildProjectedDragSettleTarget({
          shortcuts,
          layoutSnapshot: dragLayoutSnapshot,
          activeShortcutId,
          hoverState: finalHoverState,
        });
        if (!activeItem || !target) return null;

        return {
          itemId: activeShortcutId,
          item: activeItem.shortcut,
          fromLeft: session.pointer.x - session.previewOffset.x,
          fromTop: session.pointer.y - session.previewOffset.y,
          toLeft: target.left,
          toTop: target.top,
        };
      })();
      clearDragState();

      if (!finalHoverState) {
        if (dragReleasePreview) {
          startDragSettlePreview(dragReleasePreview);
        }
        return;
      }

      if (finalHoverState.type === 'mask') {
        return;
      }

      const targetShortcutIndex = shortcuts.findIndex((shortcut) => shortcut.id === finalHoverState.shortcutId);
      if (targetShortcutIndex < 0) return;

      const targetIndex = getReorderTargetIndex(activeShortcutIndex, targetShortcutIndex, finalHoverState.edge);
      if (targetIndex === activeShortcutIndex) {
        if (dragReleasePreview) {
          startDragSettlePreview(dragReleasePreview);
        }
        return;
      }

      armProjectionSettleSuppression();
      if (dragReleasePreview) {
        startDragSettlePreview(dragReleasePreview);
      }
      onShortcutDropIntent({
        type: 'reorder-folder-shortcuts',
        folderId,
        shortcutId: activeShortcutId,
        targetIndex,
        edge: finalHoverState.edge,
      });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerEnd, { passive: true });
    window.addEventListener('pointercancel', handlePointerEnd, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [
    armProjectionSettleSuppression,
    clearDragState,
    folderId,
    measuredItems,
    onShortcutDropIntent,
    resolveHoverState,
    shortcuts,
    startDragSettlePreview,
    dragLayoutSnapshot,
  ]);

  useEffect(() => () => {
    if (projectionSettleResumeRafRef.current !== null) {
      window.cancelAnimationFrame(projectionSettleResumeRafRef.current);
      projectionSettleResumeRafRef.current = null;
    }
    onDragActiveChange?.(false);
    clearDragState();
    clearDragSettlePreview();
  }, [clearDragSettlePreview, clearDragState, onDragActiveChange]);

  if (shortcuts.length === 0) {
    if (renderEmptyState) {
      return <>{renderEmptyState()}</>;
    }

    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-[24px] border border-dashed border-black/15 bg-black/5 text-sm text-black/55">
        {emptyText}
      </div>
    );
  }

  const hoveredMask = hoverState?.type === 'mask';

  return (
    <>
      <FolderMaskDropZones
        active={Boolean(activeDragId)}
        hovered={hoveredMask}
        boundaryRef={maskBoundaryRef}
      />
      <div
        ref={rootRef}
        className="relative grid"
        style={{
          gridTemplateColumns: `repeat(${Math.max(columns, 1)}, minmax(0, 1fr))`,
          columnGap: `${columnGap}px`,
          rowGap: `${rowGap}px`,
        }}
        data-folder-shortcut-grid="true"
      >
        {activeDragId && projectedDropPreview ? renderDropPreview(projectedDropPreview) : null}
        {measuredItems.map((item) => {
          const isDragging = hiddenShortcutId === item.shortcut.id;
          const dragProjectionOffset = projectionOffsets.get(item.shortcut.id) ?? null;
          const layoutShiftOffset = layoutShiftOffsets.get(item.shortcut.id) ?? null;
          const projectionOffset = combineProjectionOffsets(
            dragProjectionOffset,
            layoutShiftOffset,
          );

          return (
            <div
              key={item.shortcut.id}
              className="relative flex justify-center"
              data-folder-shortcut-grid-item="true"
            >
              <GridDragItemFrame
                isDragging={isDragging}
                hideDragPlaceholder
                projectionOffset={projectionOffset}
                disableReorderAnimation={disableLayoutShiftTransition || suppressProjectionSettleAnimation}
                firefox={isFirefox}
                registerElement={(element) => {
                  if (element) {
                    itemElementsRef.current.set(item.shortcut.id, element);
                    return;
                  }
                  itemElementsRef.current.delete(item.shortcut.id);
                }}
                onPointerDown={(event) => {
                  if (event.button !== 0 || !event.isPrimary) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  pendingDragRef.current = {
                    pointerId: event.pointerId,
                    pointerType: event.pointerType,
                    activeId: item.shortcut.id,
                    activeShortcutId: item.shortcut.id,
                    activeShortcutIndex: item.shortcutIndex,
                    origin: { x: event.clientX, y: event.clientY },
                    previewOffset: buildPreviewOffsetFromPointer({
                      rect,
                      pointer: { x: event.clientX, y: event.clientY },
                    }),
                  };
                }}
                placeholder={buildDefaultPlaceholder(item.layout)}
                frameProps={{
                  'data-folder-shortcut-id': item.shortcut.id,
                }}
              >
                {renderItem({
                  shortcut: item.shortcut,
                  shortcutIndex: item.shortcutIndex,
                  isDragging,
                  onOpen: () => {
                    if (ignoreClickRef.current) return;
                    onShortcutOpen(item.shortcut);
                  },
                  onContextMenu: (event) => {
                    if (ignoreClickRef.current) return;
                    onShortcutContextMenu?.(event, item.shortcut);
                  },
                })}
              </GridDragItemFrame>
            </div>
          );
        })}
      </div>
      {activeDragItem && dragPointer && dragPreviewOffset && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="pointer-events-none fixed left-0 top-0 isolate"
              style={{
                zIndex: overlayZIndex,
                transform: `translate3d(${dragPointer.x - dragPreviewOffset.x}px, ${dragPointer.y - dragPreviewOffset.y}px, 0)`,
              }}
            >
              {renderDragPreview({
                shortcut: activeDragItem.shortcut,
                shortcutIndex: activeDragItem.shortcutIndex,
              })}
            </div>,
            document.body,
          )
        : null}
      {dragSettlePreview && typeof document !== 'undefined' ? createPortal(
        <div
          className="pointer-events-none fixed left-0 top-0 isolate"
          style={{
            zIndex: overlayZIndex,
            transform: `translate3d(${dragSettlePreview.settling ? dragSettlePreview.toLeft : dragSettlePreview.fromLeft}px, ${dragSettlePreview.settling ? dragSettlePreview.toTop : dragSettlePreview.fromTop}px, 0)`,
            transition: `transform ${DRAG_RELEASE_SETTLE_DURATION_MS}ms ease-out`,
          }}
        >
          {renderDragPreview({
            shortcut: dragSettlePreview.item,
            shortcutIndex: shortcuts.findIndex((shortcut) => shortcut.id === dragSettlePreview.item.id),
          })}
        </div>,
        document.body,
      ) : null}
    </>
  );
}
