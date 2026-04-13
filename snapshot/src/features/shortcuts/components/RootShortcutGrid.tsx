import { ShortcutGrid } from '@/components/ShortcutGrid';
import type {
  ExternalShortcutDragSession,
  ShortcutGridCardRenderParams,
  ShortcutGridDragPreviewRenderParams,
  ShortcutGridProps,
  ShortcutGridSelectionIndicatorRenderParams,
} from '@/components/ShortcutGrid';

export type RootShortcutGridProps = ShortcutGridProps;
export type RootShortcutGridCardRenderParams = ShortcutGridCardRenderParams;
export type RootShortcutGridDragPreviewRenderParams = ShortcutGridDragPreviewRenderParams;
export type RootShortcutGridSelectionIndicatorRenderParams = ShortcutGridSelectionIndicatorRenderParams;
export type RootShortcutExternalDragSession = ExternalShortcutDragSession;

export const RootShortcutGrid = ShortcutGrid;
