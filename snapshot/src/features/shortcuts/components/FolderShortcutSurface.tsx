import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import { ShortcutCardCompact } from '@/components/shortcuts/ShortcutCardCompact';
import { ShortcutIconRenderContext, type ShortcutMonochromeTone } from '@/components/ShortcutIconRenderContext';
import { getCompactShortcutCardMetrics } from '@/components/shortcuts/compactFolderLayout';
import { getLargeFolderBorderRadius, getSmallFolderBorderRadius } from '@/components/shortcuts/ShortcutFolderPreview';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import { DraggableShortcutItemFrame } from '@/features/shortcuts/components/DraggableShortcutItemFrame';
import { getDropEdge, getReorderTargetIndex } from '@/features/shortcuts/drag/dropEdge';
import type {
  FolderExtractDragStartPayload,
  FolderShortcutDropIntent,
  RootDropEdge,
} from '@/features/shortcuts/drag/types';
import {
  combineProjectionOffsets,
  measureDragItemRects,
} from '@/features/shortcuts/drag/dragMotion';
import {
  buildReorderProjectionOffsets as buildSharedReorderProjectionOffsets,
  getDragVisualCenter,
  measureDragItems,
  pickClosestMeasuredItem,
  pointInRect,
  type ActivePointerDragState,
  type MeasuredDragItem,
  type PendingPointerDragState,
  type PointerPoint,
  type ProjectionOffset,
} from '@/features/shortcuts/drag/gridDragEngine';
import {
  buildDragAnchor,
  buildPreviewOffsetFromPointer,
  hasPointerDragActivated,
} from '@/features/shortcuts/drag/pointerDragSession';
import { useDragMotionState } from '@/features/shortcuts/drag/useDragMotionState';
import { getShortcutIconBorderRadius } from '@/utils/shortcutIconSettings';

export type { FolderExtractDragStartPayload } from '@/features/shortcuts/drag/types';

type FolderShortcutSurfaceProps = {
  folderId: string;
  shortcuts: Shortcut[];
  emptyText: string;
  compactIconSize?: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  forceTextWhite?: boolean;
  showShortcutTitles?: boolean;
  maskBoundaryRef: React.RefObject<HTMLElement | null>;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu?: (event: React.MouseEvent<HTMLDivElement>, shortcut: Shortcut) => void;
  onShortcutDropIntent: (intent: FolderShortcutDropIntent) => void;
  onExtractDragStart?: (payload: FolderExtractDragStartPayload) => void;
  onDragActiveChange?: (active: boolean) => void;
};

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

type MeasuredFolderItem = MeasuredDragItem<{
  shortcut: Shortcut;
  shortcutIndex: number;
}>;

const DRAG_MATCH_DISTANCE_PX = 72;
const EXTRACT_HANDOFF_DELAY_MS = 520;
const DRAG_OVERLAY_Z_INDEX = 2147483000;
const LAYOUT_SHIFT_MIN_DISTANCE_PX = 0.5;
const DRAG_RELEASE_SETTLE_DURATION_MS = 220;

type FolderProjectedDropPreview = {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius: string;
};

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
  layoutSnapshot: MeasuredFolderItem[] | null;
  activeShortcutId: string | null;
  hoverState: FolderHoverState;
  rootElement: HTMLDivElement | null;
  compactIconSize: number;
  iconCornerRadius: number;
}): FolderProjectedDropPreview | null {
  const {
    shortcuts,
    layoutSnapshot,
    activeShortcutId,
    hoverState,
    rootElement,
    compactIconSize,
    iconCornerRadius,
  } = params;

  if (!layoutSnapshot || !activeShortcutId || !rootElement || hoverState?.type === 'mask') {
    return null;
  }

  const activeShortcut = shortcuts.find((shortcut) => shortcut.id === activeShortcutId);
  if (!activeShortcut) return null;

  const snapshotById = new Map(layoutSnapshot.map((item) => [item.shortcut.id, item.rect]));
  const activeSnapshot = snapshotById.get(activeShortcutId);
  if (!activeSnapshot) return null;

  const targetRect = hoverState?.type === 'item'
    ? snapshotById.get(hoverState.shortcutId) ?? activeSnapshot
    : activeSnapshot;
  const metrics = getCompactShortcutCardMetrics({
    shortcut: activeShortcut,
    iconSize: compactIconSize,
  });
  const rootRect = rootElement.getBoundingClientRect();
  const borderRadius = activeShortcut.kind === 'folder'
    ? (activeShortcut.folderDisplayMode === 'large'
        ? getLargeFolderBorderRadius(metrics.previewSize, iconCornerRadius)
        : getSmallFolderBorderRadius(metrics.previewSize, iconCornerRadius))
    : getShortcutIconBorderRadius(iconCornerRadius);

  return {
    left: targetRect.left - rootRect.left + Math.max(0, (targetRect.width - metrics.previewSize) / 2),
    top: targetRect.top - rootRect.top,
    width: metrics.previewSize,
    height: metrics.previewSize,
    borderRadius,
  };
}

function measureFolderItems(
  shortcuts: Shortcut[],
  itemElements: Map<string, HTMLDivElement>,
): MeasuredFolderItem[] {
  return measureDragItems({
    items: shortcuts.map((shortcut, shortcutIndex) => ({ shortcut, shortcutIndex })),
    itemElements,
    getId: (item) => item.shortcut.id,
  });
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
  const zoneClassName = hovered ? 'bg-primary/12' : 'bg-background/4';

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

function FloatingFolderShortcutPreview({
  shortcut,
  pointer,
  previewOffset,
  compactIconSize = 72,
  iconCornerRadius,
  iconAppearance,
  forceTextWhite,
}: {
  shortcut: Shortcut;
  pointer: PointerPoint;
  previewOffset: PointerPoint;
  compactIconSize?: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  forceTextWhite?: boolean;
}) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="pointer-events-none fixed left-0 top-0 isolate"
      style={{
        zIndex: DRAG_OVERLAY_Z_INDEX,
        transform: `translate3d(${pointer.x - previewOffset.x}px, ${pointer.y - previewOffset.y}px, 0)`,
      }}
    >
      <ShortcutCardCompact
        shortcut={shortcut}
        showTitle
        iconSize={compactIconSize}
        iconCornerRadius={iconCornerRadius}
        iconAppearance={iconAppearance}
        titleFontSize={12}
        forceTextWhite={forceTextWhite}
        onOpen={() => {}}
        onContextMenu={() => {}}
      />
    </div>,
    document.body,
  );
}

export function FolderShortcutSurface({
  folderId,
  shortcuts,
  emptyText,
  compactIconSize = 72,
  iconCornerRadius,
  iconAppearance,
  forceTextWhite = false,
  showShortcutTitles = true,
  maskBoundaryRef,
  onShortcutOpen,
  onShortcutContextMenu,
  onShortcutDropIntent,
  onExtractDragStart,
  onDragActiveChange,
}: FolderShortcutSurfaceProps) {
  const firefox = isFirefoxBuildTarget();
  const shortcutIconRenderContextValue = useMemo(() => ({
    monochromeTone: 'theme-adaptive' as ShortcutMonochromeTone,
    monochromeTileBackdropBlur: false,
  }), []);
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
  const dragMotion = useDragMotionState<Shortcut>({
    minLayoutShiftDistancePx: LAYOUT_SHIFT_MIN_DISTANCE_PX,
    settleDurationMs: DRAG_RELEASE_SETTLE_DURATION_MS,
  });
  const {
    layoutShiftOffsets,
    disableLayoutShiftTransition,
    dragSettlePreview,
    commitMeasuredItemRects,
    startDragSettlePreview,
    clearDragSettlePreview,
  } = dragMotion;

  const activeDragShortcut = useMemo(
    () => shortcuts.find((shortcut) => shortcut.id === activeDragId) ?? null,
    [activeDragId, shortcuts],
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
    layoutSnapshot: dragLayoutSnapshot,
    activeShortcutId: activeDragId,
    hoverState,
    rootElement: rootRef.current,
    compactIconSize,
    iconCornerRadius: iconCornerRadius ?? 22,
  }), [
    activeDragId,
    compactIconSize,
    dragLayoutSnapshot,
    hoverState,
    iconCornerRadius,
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
  }, [activeDragId, commitMeasuredItemRects, shortcuts, suppressProjectionSettleAnimation]);

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

    const activeItem = (dragLayoutSnapshot ?? measureFolderItems(shortcuts, itemElementsRef.current))
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
  }, [clearDragState, dragLayoutSnapshot, folderId, onExtractDragStart, shortcuts]);

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
    const measuredItems = dragLayoutSnapshot ?? measureFolderItems(shortcuts, itemElementsRef.current);
    const activeItem = measuredItems.find((item) => item.shortcut.id === session.activeShortcutId);
    if (!activeItem) return null;
    const visualSize = Math.min(compactIconSize, activeItem.rect.width, activeItem.rect.height);
    const recognitionPoint = getDragVisualCenter({
      pointer,
      previewOffset: session.previewOffset,
      activeRect: activeItem.rect,
      visualRect: {
        offsetX: Math.max(0, (activeItem.rect.width - visualSize) / 2),
        offsetY: 0,
        width: visualSize,
        height: visualSize,
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
      measuredItems,
      pointer: recognitionPoint,
    });
    if (!overItem) return null;

    const edge = getDropEdge(recognitionPoint, overItem.rect);
    return {
      type: 'item',
      shortcutId: overItem.shortcut.id,
      edge: edge === 'center' ? 'after' : edge,
    };
  }, [clearExtractHandoffTimer, compactIconSize, dragLayoutSnapshot, ensureExtractHandoffTimer, maskBoundaryRef, shortcuts]);

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
        setDragLayoutSnapshot(measureFolderItems(shortcuts, itemElementsRef.current));
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
        const activeShortcut = shortcuts.find((shortcut) => shortcut.id === activeShortcutId) ?? null;
        const target = buildProjectedDragSettleTarget({
          shortcuts,
          layoutSnapshot: dragLayoutSnapshot,
          activeShortcutId,
          hoverState: finalHoverState,
        });
        if (!activeShortcut || !target) return null;

        return {
          itemId: activeShortcutId,
          item: activeShortcut,
          shortcutId: activeShortcutId,
          shortcut: activeShortcut,
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
    onShortcutDropIntent,
    resolveHoverState,
    shortcuts,
    startDragSettlePreview,
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
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-[24px] border border-dashed border-border/80 bg-secondary/20 text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  const hoveredMask = hoverState?.type === 'mask';

  return (
    <ShortcutIconRenderContext.Provider value={shortcutIconRenderContextValue}>
      <FolderMaskDropZones
        active={Boolean(activeDragId)}
        hovered={hoveredMask}
        boundaryRef={maskBoundaryRef}
      />
      <div
        ref={rootRef}
        className="relative grid grid-cols-3 gap-x-4 gap-y-5 sm:grid-cols-4"
        data-folder-shortcut-grid="true"
      >
        {activeDragId && projectedDropPreview ? (
          <div
            data-testid="folder-shortcut-drop-preview"
            aria-hidden="true"
            className="pointer-events-none absolute z-0 bg-black/14"
            style={{
              left: projectedDropPreview.left,
              top: projectedDropPreview.top,
              width: projectedDropPreview.width,
              height: projectedDropPreview.height,
              borderRadius: projectedDropPreview.borderRadius,
            }}
          />
        ) : null}
        {shortcuts.map((shortcut, shortcutIndex) => {
          const isDragging = hiddenShortcutId === shortcut.id;
          const dragProjectionOffset = projectionOffsets.get(shortcut.id) ?? null;
          const layoutShiftOffset = layoutShiftOffsets.get(shortcut.id) ?? null;
          const projectionOffset = combineProjectionOffsets(
            dragProjectionOffset,
            layoutShiftOffset,
          );

          return (
            <div
              key={shortcut.id}
              className="relative flex justify-center"
              data-folder-shortcut-grid-item="true"
            >
              <DraggableShortcutItemFrame
                cardVariant="compact"
                compactIconSize={compactIconSize}
                iconCornerRadius={iconCornerRadius ?? 22}
                defaultPlaceholderHeight={Math.round(compactIconSize + 24)}
                isDragging={isDragging}
                hideDragPlaceholder
                projectionOffset={projectionOffset}
                disableReorderAnimation={disableLayoutShiftTransition || suppressProjectionSettleAnimation}
                firefox={firefox}
                registerElement={(element) => {
                  if (element) {
                    itemElementsRef.current.set(shortcut.id, element);
                    return;
                  }
                  itemElementsRef.current.delete(shortcut.id);
                }}
                onPointerDown={(event) => {
                  if (event.button !== 0 || !event.isPrimary) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  pendingDragRef.current = {
                    pointerId: event.pointerId,
                    pointerType: event.pointerType,
                    activeId: shortcut.id,
                    activeShortcutId: shortcut.id,
                    activeShortcutIndex: shortcutIndex,
                    origin: { x: event.clientX, y: event.clientY },
                    previewOffset: buildPreviewOffsetFromPointer({
                      rect,
                      pointer: { x: event.clientX, y: event.clientY },
                    }),
                  };
                }}
                frameProps={{
                  'data-testid': `folder-shortcut-card-${shortcut.id}`,
                  'data-folder-shortcut-id': shortcut.id,
                }}
              >
                <ShortcutCardCompact
                  shortcut={shortcut}
                  showTitle={showShortcutTitles}
                  iconSize={compactIconSize}
                  iconCornerRadius={iconCornerRadius}
                  iconAppearance={iconAppearance}
                  titleFontSize={12}
                  forceTextWhite={forceTextWhite}
                  disableIconWrapperEffects
                  iconContentProps={{
                    'data-folder-overlay-child-id': shortcut.id,
                  }}
                  onOpen={() => {
                    if (ignoreClickRef.current) return;
                    onShortcutOpen(shortcut);
                  }}
                  onContextMenu={(event) => {
                    if (ignoreClickRef.current) return;
                    onShortcutContextMenu?.(event, shortcut);
                  }}
                />
              </DraggableShortcutItemFrame>
            </div>
          );
        })}
      </div>
      {activeDragShortcut && dragPointer && dragPreviewOffset ? (
        <FloatingFolderShortcutPreview
          shortcut={activeDragShortcut}
          pointer={dragPointer}
          previewOffset={dragPreviewOffset}
          compactIconSize={compactIconSize}
          iconCornerRadius={iconCornerRadius}
          iconAppearance={iconAppearance}
          forceTextWhite={forceTextWhite}
        />
      ) : null}
      {dragSettlePreview && typeof document !== 'undefined' ? createPortal(
        <div
          className="pointer-events-none fixed left-0 top-0 isolate"
          style={{
            zIndex: DRAG_OVERLAY_Z_INDEX,
            transform: `translate3d(${dragSettlePreview.settling ? dragSettlePreview.toLeft : dragSettlePreview.fromLeft}px, ${dragSettlePreview.settling ? dragSettlePreview.toTop : dragSettlePreview.fromTop}px, 0)`,
            transition: `transform ${DRAG_RELEASE_SETTLE_DURATION_MS}ms ease-out`,
          }}
        >
          <ShortcutCardCompact
            shortcut={dragSettlePreview.item}
            showTitle
            iconSize={compactIconSize}
            iconCornerRadius={iconCornerRadius}
            iconAppearance={iconAppearance}
            titleFontSize={12}
            forceTextWhite={forceTextWhite}
            onOpen={() => {}}
            onContextMenu={() => {}}
          />
        </div>,
        document.body,
      ) : null}
    </ShortcutIconRenderContext.Provider>
  );
}
