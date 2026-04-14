import {
  ROOT_SHORTCUTS_PATH,
  applyFolderExtractDragStart,
  applyShortcutDropIntent,
  countShortcutLinks,
  findShortcutById,
  getShortcutChildren,
  isShortcutFolder,
  mergeShortcutsIntoNewFolder,
  type Shortcut,
} from '@leaftab/workspace-core';
import {
  FolderShortcutSurface,
  RootShortcutGrid,
  type FolderShortcutSurfaceRenderDragPreviewParams,
  type FolderShortcutSurfaceRenderItemParams,
  type RootShortcutExternalDragSession,
  type RootShortcutGridRenderCenterPreviewParams,
  type RootShortcutGridRenderDragPreviewParams,
  type RootShortcutGridRenderDropPreviewParams,
  type RootShortcutGridRenderItemParams,
} from '@leaftab/workspace-react';
import {
  LEAFTAB_COMPACT_GRID_METRICS,
  computeLeaftabLargeFolderPreviewSize,
  createLeaftabFolderSurfacePreset,
  createLeaftabRootGridPreset,
} from '@leaftab/workspace-preset-leaftab';
import {
  startTransition,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';

function createLink(
  id: string,
  title: string,
  url: string,
  icon: string,
): Shortcut {
  return {
    id,
    title,
    url,
    icon,
    iconRendering: 'letter',
  };
}

const DESKTOP_COLUMNS = [4, 5, 6] as const;

const INITIAL_SHORTCUTS: Shortcut[] = [
  createLink('canvas', 'Canvas', 'https://canvas.apps.chrome', 'CV'),
  createLink('relay', 'Relay', 'https://relay.example', 'RY'),
  createLink('north', 'Northstar', 'https://northstar.example', 'NS'),
  createLink('field', 'Field Notes', 'https://fieldnotes.example', 'FN'),
  {
    id: 'folder-research',
    title: 'Research Deck',
    url: '',
    icon: 'RD',
    kind: 'folder',
    folderDisplayMode: 'small',
    children: [
      createLink('arxiv', 'Arxiv', 'https://arxiv.org', 'AR'),
      createLink('drive', 'Drive', 'https://drive.google.com', 'DR'),
      createLink('atlas', 'Atlas', 'https://atlas.example', 'AT'),
      createLink('brief', 'Brief', 'https://brief.example', 'BF'),
    ],
  },
  createLink('mailroom', 'Mailroom', 'https://mail.google.com', 'ML'),
  createLink('ledger', 'Ledger', 'https://ledger.example', 'LG'),
  {
    id: 'folder-launch',
    title: 'Launch Deck',
    url: '',
    icon: 'LD',
    kind: 'folder',
    folderDisplayMode: 'large',
    children: [
      createLink('beta', 'Beta', 'https://beta.example', 'BT'),
      createLink('signal', 'Signal', 'https://signal.example', 'SG'),
      createLink('orbit', 'Orbit', 'https://orbit.example', 'OB'),
      createLink('vista', 'Vista', 'https://vista.example', 'VS'),
      createLink('pilot', 'Pilot', 'https://pilot.example', 'PT'),
      createLink('frame', 'Frame', 'https://frame.example', 'FR'),
      createLink('delta', 'Delta', 'https://delta.example', 'DL'),
      createLink('ridge', 'Ridge', 'https://ridge.example', 'RG'),
      createLink('echo', 'Echo', 'https://echo.example', 'EC'),
    ],
  },
  createLink('finder', 'Finder', 'https://finder.example', 'FD'),
  createLink('console', 'Console', 'https://console.example', 'CS'),
  createLink('studio', 'Studio', 'https://studio.example', 'ST'),
];

function getInitials(shortcut: Shortcut) {
  const explicit = shortcut.icon.trim();
  if (explicit) return explicit.slice(0, 2).toUpperCase();
  const words = shortcut.title.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.slice(0, 2).map((word) => word.slice(0, 1)).join('').toUpperCase();
  }
  return shortcut.title.slice(0, 2).toUpperCase();
}

function getAccentToken(seed: string) {
  const tokens = ['amber', 'ink', 'coral', 'teal'];
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 1000;
  }
  return tokens[Math.abs(hash) % tokens.length];
}

function ThemeFolderPreview({
  shortcut,
  large,
  previewSize,
}: {
  shortcut: Shortcut;
  large: boolean;
  previewSize: number;
}) {
  const children = getShortcutChildren(shortcut).slice(0, large ? 9 : 4);
  const total = large ? 9 : 4;

  return (
    <div
      className={large ? 'studio-folder studio-folder--large' : 'studio-folder'}
      style={{
        width: previewSize,
        height: previewSize,
      }}
    >
      {Array.from({ length: total }).map((_, index) => {
        const child = children[index];
        return (
          <span
            key={child?.id ?? `${shortcut.id}-${index}`}
            className={child ? `studio-folder__chip studio-folder__chip--${getAccentToken(child.id)}` : 'studio-folder__chip studio-folder__chip--empty'}
          >
            {child ? getInitials(child) : null}
          </span>
        );
      })}
    </div>
  );
}

function ThemeShortcutCard({
  shortcut,
  dragPreview = false,
  centerPreview = false,
  largeFolderPreviewSize,
}: {
  shortcut: Shortcut;
  dragPreview?: boolean;
  centerPreview?: boolean;
  largeFolderPreviewSize?: number;
}) {
  const folder = isShortcutFolder(shortcut);
  const large = folder && shortcut.folderDisplayMode === 'large';
  const accent = getAccentToken(shortcut.id);
  const previewSize = large
    ? (largeFolderPreviewSize
      ?? LEAFTAB_COMPACT_GRID_METRICS.iconSize * LEAFTAB_COMPACT_GRID_METRICS.largeFolderGridSpan
      + LEAFTAB_COMPACT_GRID_METRICS.columnGap)
    : LEAFTAB_COMPACT_GRID_METRICS.iconSize;

  return (
    <div
      className={[
        'studio-card',
        `studio-card--${accent}`,
        dragPreview ? 'studio-card--preview' : '',
        centerPreview ? 'studio-card--center' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="studio-card__preview">
        {folder ? (
          <ThemeFolderPreview
            shortcut={shortcut}
            large={large}
            previewSize={previewSize}
          />
        ) : (
          <div className={`studio-glyph studio-glyph--${accent}`}>
            {getInitials(shortcut)}
          </div>
        )}
      </div>
      <div className="studio-card__copy">
        <p className="studio-card__title">{shortcut.title}</p>
        <p className="studio-card__meta">
          {folder ? `${getShortcutChildren(shortcut).length} items` : 'shortcut'}
        </p>
      </div>
    </div>
  );
}

function renderThemeRootItem(
  params: RootShortcutGridRenderItemParams,
  options?: { largeFolderPreviewSize?: number },
) {
  return (
    <button
      type="button"
      className="studio-card-button"
      onClick={params.onOpen}
      onContextMenu={(event) => params.onContextMenu(event as unknown as ReactMouseEvent<HTMLDivElement>)}
    >
      <ThemeShortcutCard
        shortcut={params.shortcut}
        centerPreview={params.centerPreviewActive}
        largeFolderPreviewSize={options?.largeFolderPreviewSize}
      />
    </button>
  );
}

function renderThemeRootDragPreview(
  params: RootShortcutGridRenderDragPreviewParams,
  options?: { largeFolderPreviewSize?: number },
) {
  return (
    <ThemeShortcutCard
      shortcut={params.shortcut}
      dragPreview
      largeFolderPreviewSize={options?.largeFolderPreviewSize}
    />
  );
}

function renderThemeFolderItem(
  params: FolderShortcutSurfaceRenderItemParams,
  options?: { largeFolderPreviewSize?: number },
) {
  return (
    <button
      type="button"
      className="studio-card-button"
      onClick={params.onOpen}
      onContextMenu={(event) => params.onContextMenu(event as unknown as ReactMouseEvent<HTMLDivElement>)}
    >
      <ThemeShortcutCard
        shortcut={params.shortcut}
        dragPreview={params.isDragging}
        largeFolderPreviewSize={options?.largeFolderPreviewSize}
      />
    </button>
  );
}

function renderThemeFolderDragPreview(
  params: FolderShortcutSurfaceRenderDragPreviewParams,
  options?: { largeFolderPreviewSize?: number },
) {
  return (
    <ThemeShortcutCard
      shortcut={params.shortcut}
      dragPreview
      largeFolderPreviewSize={options?.largeFolderPreviewSize}
    />
  );
}

function renderThemeDropPreview(
  params: RootShortcutGridRenderDropPreviewParams,
) {
  return (
    <div
      aria-hidden="true"
      className="studio-drop-preview"
      style={{
        left: params.left,
        top: params.top,
        width: params.width,
        height: params.height,
        borderRadius: params.borderRadius ?? '26px',
      }}
    />
  );
}

function renderThemeCenterPreview(
  params: RootShortcutGridRenderCenterPreviewParams,
  options?: { largeFolderPreviewSize?: number },
) {
  const largeFolder = isShortcutFolder(params.shortcut) && params.shortcut.folderDisplayMode === 'large';
  const previewSize = largeFolder
    ? (options?.largeFolderPreviewSize
      ?? LEAFTAB_COMPACT_GRID_METRICS.iconSize * LEAFTAB_COMPACT_GRID_METRICS.largeFolderGridSpan
      + LEAFTAB_COMPACT_GRID_METRICS.columnGap)
    : LEAFTAB_COMPACT_GRID_METRICS.iconSize;
  const ringInset = 8;

  return (
    <div
      aria-hidden="true"
      className="studio-merge-ring"
      style={{
        width: previewSize + ringInset * 2,
        height: previewSize + ringInset * 2,
        top: -ringInset,
      }}
    />
  );
}

export function App() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(INITIAL_SHORTCUTS);
  const [openFolderId, setOpenFolderId] = useState<string | null>('folder-launch');
  const [preferredColumns, setPreferredColumns] = useState<(typeof DESKTOP_COLUMNS)[number]>(5);
  const [externalDragSession, setExternalDragSession] = useState<RootShortcutExternalDragSession | null>(null);
  const [status, setStatus] = useState('Theme path active. This host keeps the grid behavior contract but uses an intentionally non-LeafTab visual system.');
  const [viewportWidth, setViewportWidth] = useState(() => (
    typeof window === 'undefined' ? 1440 : window.innerWidth
  ));
  const [gridWidthPx, setGridWidthPx] = useState<number | null>(null);

  const rootGridFrameRef = useRef<HTMLDivElement | null>(null);
  const folderMaskRef = useRef<HTMLDivElement | null>(null);
  const dragTokenRef = useRef(0);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useLayoutEffect(() => {
    const node = rootGridFrameRef.current;
    if (!node || typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
      return;
    }

    const updateWidth = () => {
      const nextWidth = Math.round(node.clientWidth);
      setGridWidthPx((current) => (current === nextWidth ? current : nextWidth));
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(node);
    window.addEventListener('resize', updateWidth, { passive: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  const compactViewport = viewportWidth < 1120;
  const gridColumns = compactViewport ? 4 : preferredColumns;
  const rowHeight = LEAFTAB_COMPACT_GRID_METRICS.iconSize + LEAFTAB_COMPACT_GRID_METRICS.titleBlockHeight;
  const rowGap = compactViewport ? 18 : LEAFTAB_COMPACT_GRID_METRICS.rowGap;
  const columnGap = 16;
  const containerHeight = compactViewport ? 620 : 720;
  const largeFolderEnabled = gridColumns >= LEAFTAB_COMPACT_GRID_METRICS.largeFolderGridSpan;
  const largeFolderPreviewSize = useMemo(() => computeLeaftabLargeFolderPreviewSize({
    gridWidthPx,
    gridColumns,
    compactIconSize: LEAFTAB_COMPACT_GRID_METRICS.iconSize,
    columnGap,
    rowGap,
    largeFolderEnabled,
  }), [columnGap, gridColumns, gridWidthPx, largeFolderEnabled, rowGap]);

  const rootGridPreset = useMemo(() => createLeaftabRootGridPreset({
    getRootRect: () => rootGridFrameRef.current?.getBoundingClientRect() ?? null,
    gridWidthPx: gridWidthPx ?? 0,
    gridColumns,
    rowHeight,
    rowGap,
    columnGap,
    largeFolderPreviewSize,
    largeFolderEnabled,
  }), [columnGap, gridColumns, gridWidthPx, largeFolderEnabled, largeFolderPreviewSize, rowGap, rowHeight]);

  const folderSurfacePreset = useMemo(() => createLeaftabFolderSurfacePreset({
    compactIconSize: LEAFTAB_COMPACT_GRID_METRICS.iconSize,
    titleBlockHeight: LEAFTAB_COMPACT_GRID_METRICS.titleBlockHeight,
    largeFolderPreviewSize,
  }), [largeFolderPreviewSize]);

  const openFolder = openFolderId ? findShortcutById(shortcuts, openFolderId) : null;
  const activeFolder = isShortcutFolder(openFolder) ? openFolder : null;
  const folderShortcuts = activeFolder ? getShortcutChildren(activeFolder) : [];
  const linkCount = countShortcutLinks(shortcuts);
  const folderCount = shortcuts.filter(isShortcutFolder).length;

  useEffect(() => {
    if (openFolderId && !activeFolder) {
      setOpenFolderId(null);
    }
  }, [activeFolder, openFolderId]);

  function updateShortcuts(nextShortcuts: Shortcut[]) {
    startTransition(() => {
      setShortcuts(nextShortcuts);
    });
  }

  function createFolderTitle(children: Shortcut[]) {
    const primary = children[0]?.title ?? 'New folder';
    const secondary = children[1]?.title;
    return secondary ? `${primary} + ${secondary}` : primary;
  }

  function createFolderFromMerge(children: Shortcut[]) {
    return {
      id: `folder-${crypto.randomUUID()}`,
      title: createFolderTitle(children),
      url: '',
      icon: 'FD',
      kind: 'folder' as const,
      folderDisplayMode: 'small' as const,
      children,
    };
  }

  function applyInteraction(
    outcome: ReturnType<typeof applyShortcutDropIntent> | ReturnType<typeof applyFolderExtractDragStart>,
    sourceLabel: string,
  ) {
    switch (outcome.kind) {
      case 'update-shortcuts':
        updateShortcuts(outcome.shortcuts);
        setStatus(`${sourceLabel}: shortcut tree updated.`);
        return;
      case 'request-folder-merge': {
        const result = mergeShortcutsIntoNewFolder(
          shortcuts,
          ROOT_SHORTCUTS_PATH,
          [outcome.activeShortcutId, outcome.targetShortcutId],
          createFolderFromMerge,
        );
        if (!result) {
          setStatus(`${sourceLabel}: merge could not be applied.`);
          return;
        }
        updateShortcuts(result.nextShortcuts);
        setOpenFolderId(result.folder.id);
        setStatus(`${sourceLabel}: merged into "${result.folder.title}".`);
        return;
      }
      case 'start-root-drag-session':
        dragTokenRef.current += 1;
        updateShortcuts(outcome.shortcuts);
        if (outcome.closeFolderId && outcome.closeFolderId === openFolderId) {
          setOpenFolderId(null);
        }
        setExternalDragSession({
          ...outcome.session,
          token: dragTokenRef.current,
        });
        setStatus(`${sourceLabel}: extracted one item back to the root grid.`);
        return;
      case 'unsupported-tree':
        setStatus(`${sourceLabel}: nested folders are intentionally outside the public contract.`);
        return;
      case 'noop':
        setStatus(`${sourceLabel}: no state change was needed.`);
        return;
      default:
        return;
    }
  }

  return (
    <main className="studio-shell">
      <section className="studio-hero">
        <div>
          <p className="studio-eyebrow">Custom theme example</p>
          <h1>Same grid engine, different host personality.</h1>
          <p className="studio-lede">
            This example keeps the folder-aware drag contract intact, but swaps the visual language completely.
            It is the proof that `leaftab-workspace` is not tied to one app aesthetic.
          </p>
        </div>
        <div className="studio-badges" aria-label="Workspace summary">
          <article>
            <span>Links</span>
            <strong>{linkCount}</strong>
          </article>
          <article>
            <span>Folders</span>
            <strong>{folderCount}</strong>
          </article>
          <article>
            <span>Open panel</span>
            <strong>{activeFolder ? folderShortcuts.length : 0}</strong>
          </article>
        </div>
      </section>

      <section className="studio-layout">
        <div className="studio-board">
          <div className="studio-board__head">
            <div>
              <p className="studio-eyebrow">Root workspace</p>
              <h2>Signal board</h2>
            </div>
            <div className="studio-board__controls">
              {!compactViewport ? (
                <div className="studio-density">
                  {DESKTOP_COLUMNS.map((columns) => (
                    <button
                      key={columns}
                      type="button"
                      className={columns === preferredColumns ? 'is-active' : ''}
                      onClick={() => setPreferredColumns(columns)}
                    >
                      {columns} cols
                    </button>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                className="studio-reset"
                onClick={() => {
                  setShortcuts(INITIAL_SHORTCUTS);
                  setOpenFolderId('folder-launch');
                  setExternalDragSession(null);
                  setStatus('Workspace reset to the custom-theme seed data.');
                }}
              >
                Reset scene
              </button>
            </div>
          </div>

          <div className="studio-status">{status}</div>

          <div ref={rootGridFrameRef} className="studio-board__canvas">
            <RootShortcutGrid
              containerHeight={containerHeight}
              shortcuts={shortcuts}
              gridColumns={gridColumns}
              minRows={4}
              rowHeight={rowHeight}
              rowGap={rowGap}
              columnGap={columnGap}
              resolveItemLayout={rootGridPreset.resolveItemLayout}
              resolveCompactTargetRegions={rootGridPreset.resolveCompactTargetRegions}
              resolveDropTargetRects={rootGridPreset.resolveDropTargetRects}
              onShortcutOpen={(shortcut) => {
                if (isShortcutFolder(shortcut)) {
                  setOpenFolderId(shortcut.id);
                  setStatus(`Root workspace: opened "${shortcut.title}".`);
                } else {
                  setStatus(`Root workspace: selected "${shortcut.title}".`);
                }
              }}
              onShortcutContextMenu={(event) => event.preventDefault()}
              onShortcutReorder={(nextShortcuts) => {
                updateShortcuts(nextShortcuts);
                setStatus('Root workspace: reordered items.');
              }}
              onShortcutDropIntent={(intent) => applyInteraction(applyShortcutDropIntent(shortcuts, intent), 'Root workspace')}
              externalDragSession={externalDragSession}
              onExternalDragSessionConsumed={(token) => {
                if (externalDragSession?.token === token) {
                  setExternalDragSession(null);
                }
              }}
              renderItem={(params) => renderThemeRootItem(params, { largeFolderPreviewSize })}
              renderDragPreview={(params) => renderThemeRootDragPreview(params, { largeFolderPreviewSize })}
              renderCenterPreview={(params) => renderThemeCenterPreview(params, { largeFolderPreviewSize })}
              renderDropPreview={renderThemeDropPreview}
            />
          </div>
        </div>

        <aside className="studio-rail">
          <section className="studio-panel">
            <div className="studio-panel__head">
              <div>
                <p className="studio-eyebrow">Folder panel</p>
                <h3>{activeFolder ? activeFolder.title : 'Open a folder'}</h3>
              </div>
              <span>{activeFolder ? `${folderShortcuts.length} items` : 'Secondary surface'}</span>
            </div>

            <div ref={folderMaskRef} className="studio-panel__body">
              {activeFolder ? (
                <FolderShortcutSurface
                  folderId={activeFolder.id}
                  shortcuts={folderShortcuts}
                  columns={4}
                  columnGap={12}
                  rowGap={12}
                  maskBoundaryRef={folderMaskRef}
                  resolveItemLayout={folderSurfacePreset.resolveItemLayout}
                  onShortcutOpen={(shortcut) => {
                    setStatus(`Folder panel: selected "${shortcut.title}".`);
                  }}
                  onShortcutContextMenu={(event) => event.preventDefault()}
                  onShortcutDropIntent={(intent) => applyInteraction(applyShortcutDropIntent(shortcuts, intent), 'Folder panel')}
                  onExtractDragStart={(payload) => applyInteraction(applyFolderExtractDragStart(shortcuts, payload), 'Folder panel')}
                  renderItem={(params) => renderThemeFolderItem(params, { largeFolderPreviewSize })}
                  renderDragPreview={(params) => renderThemeFolderDragPreview(params, { largeFolderPreviewSize })}
                  renderDropPreview={(params) => renderThemeDropPreview(params as RootShortcutGridRenderDropPreviewParams)}
                />
              ) : (
                <div className="studio-panel__empty">
                  <h4>No folder selected</h4>
                  <p>Open a folder card from the root board to inspect children and drag them back out.</p>
                </div>
              )}
            </div>
          </section>

          <section className="studio-notes">
            <article>
              <span>Why this exists</span>
              <strong>Use the same engine, but prove you can build something that does not look like LeafTab.</strong>
            </article>
            <article>
              <span>What stays shared</span>
              <strong>Merge on center drop, folder extraction, large-folder placement, and packed reorder behavior.</strong>
            </article>
            <article>
              <span>What changes freely</span>
              <strong>Typography, panel composition, card shell, theme tokens, and overall product mood.</strong>
            </article>
          </section>
        </aside>
      </section>
    </main>
  );
}
