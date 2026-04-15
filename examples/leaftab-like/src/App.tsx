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
  type RootShortcutExternalDragSession,
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
} from 'react';

type StatusTone = 'neutral' | 'accent' | 'success';

function createLink(
  id: string,
  title: string,
  url: string,
  icon: string,
  iconColor: string,
): Shortcut {
  return {
    id,
    title,
    url,
    icon,
    iconColor,
    iconRendering: 'letter',
  };
}

const DESKTOP_COLUMNS = [5, 6, 7] as const;

const INITIAL_SHORTCUTS: Shortcut[] = [
  createLink('github', 'GitHub', 'https://github.com', 'GH', '#111827'),
  createLink('figma', 'Figma', 'https://figma.com', 'Fg', '#111827'),
  createLink('notion', 'Notion', 'https://notion.so', 'Nt', '#fafaf9'),
  createLink('docs', 'Docs', 'https://developer.mozilla.org', 'MD', '#0f172a'),
  {
    id: 'folder-build',
    title: 'Build Lab',
    url: '',
    icon: 'BL',
    kind: 'folder',
    folderDisplayMode: 'small',
    children: [
      createLink('vite', 'Vite', 'https://vite.dev', 'Vi', '#7c3aed'),
      createLink('vitest', 'Vitest', 'https://vitest.dev', 'Vt', '#166534'),
      createLink('npm', 'npm', 'https://npmjs.com', 'np', '#7f1d1d'),
      createLink('pnpm', 'pnpm', 'https://pnpm.io', 'Pn', '#9a3412'),
    ],
  },
  createLink('linear', 'Linear', 'https://linear.app', 'Li', '#312e81'),
  createLink('slack', 'Slack', 'https://slack.com', 'Sl', '#6b21a8'),
  createLink('arc', 'Arc', 'https://arc.net', 'Ar', '#7c3aed'),
  {
    id: 'folder-launch',
    title: 'Launch Stack',
    url: '',
    icon: 'LS',
    kind: 'folder',
    folderDisplayMode: 'large',
    children: [
      createLink('leaftab', 'LeafTab', 'https://github.com/mason173/LeafTab', 'LT', '#14532d'),
      createLink('chrome', 'Chrome', 'https://developer.chrome.com', 'Ch', '#1d4ed8'),
      createLink('edge', 'Edge', 'https://www.microsoft.com/edge', 'Ed', '#0f766e'),
      createLink('firefox', 'Firefox', 'https://www.mozilla.org/firefox', 'Fx', '#9a3412'),
      createLink('astro', 'Astro', 'https://astro.build', 'As', '#7c2d12'),
      createLink('storybook', 'Storybook', 'https://storybook.js.org', 'Sb', '#831843'),
      createLink('playwright', 'Playwright', 'https://playwright.dev', 'Pw', '#14532d'),
      createLink('vercel', 'Vercel', 'https://vercel.com', 'Ve', '#111827'),
      createLink('supabase', 'Supabase', 'https://supabase.com', 'Su', '#166534'),
    ],
  },
  createLink('calendar', 'Calendar', 'https://calendar.google.com', 'Ca', '#1d4ed8'),
  createLink('drive', 'Drive', 'https://drive.google.com', 'Dr', '#14532d'),
  createLink('mail', 'Mail', 'https://mail.google.com', 'Ml', '#b91c1c'),
];

export function App() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(INITIAL_SHORTCUTS);
  const [openFolderId, setOpenFolderId] = useState<string | null>('folder-launch');
  const [preferredColumns, setPreferredColumns] = useState<(typeof DESKTOP_COLUMNS)[number]>(6);
  const [externalDragSession, setExternalDragSession] = useState<RootShortcutExternalDragSession | null>(null);
  const [status, setStatus] = useState('Ready. Drag to reorder, drop on center to merge, or pull folder items back out to root.');
  const [statusTone, setStatusTone] = useState<StatusTone>('neutral');
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
  const rowGap = compactViewport ? 16 : LEAFTAB_COMPACT_GRID_METRICS.rowGap;
  const columnGap = LEAFTAB_COMPACT_GRID_METRICS.columnGap;
  const containerHeight = compactViewport ? 620 : 760;
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
    iconCornerRadius: LEAFTAB_COMPACT_GRID_METRICS.iconCornerRadius,
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

  function setSurfaceStatus(message: string, tone: StatusTone = 'neutral') {
    setStatus(message);
    setStatusTone(tone);
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
        setSurfaceStatus(`${sourceLabel}: shortcut tree updated.`, 'success');
        return;
      case 'request-folder-merge': {
        const result = mergeShortcutsIntoNewFolder(
          shortcuts,
          ROOT_SHORTCUTS_PATH,
          [outcome.activeShortcutId, outcome.targetShortcutId],
          createFolderFromMerge,
          outcome.targetShortcutId,
        );
        if (!result) {
          setSurfaceStatus(`${sourceLabel}: merge could not be applied.`, 'accent');
          return;
        }
        updateShortcuts(result.nextShortcuts);
        setOpenFolderId(result.folder.id);
        setSurfaceStatus(`${sourceLabel}: merged into folder "${result.folder.title}".`, 'success');
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
        setSurfaceStatus(`${sourceLabel}: extracted one shortcut back to the root grid.`, 'success');
        return;
      case 'unsupported-tree':
        setSurfaceStatus(`${sourceLabel}: nested folders are outside the current open-source contract.`, 'accent');
        return;
      case 'noop':
        setSurfaceStatus(`${sourceLabel}: no state change was needed.`, 'neutral');
        return;
      default:
        return;
    }
  }

  function handleRootDropIntent(intent: Parameters<typeof applyShortcutDropIntent>[1]) {
    applyInteraction(applyShortcutDropIntent(shortcuts, intent), 'Root grid');
  }

  function handleFolderDropIntent(intent: Parameters<typeof applyShortcutDropIntent>[1]) {
    applyInteraction(applyShortcutDropIntent(shortcuts, intent), 'Folder panel');
  }

  function handleFolderExtractDragStart(payload: Parameters<typeof applyFolderExtractDragStart>[1]) {
    applyInteraction(applyFolderExtractDragStart(shortcuts, payload), 'Folder panel');
  }

  function handleShortcutOpen(shortcut: Shortcut, source: 'root' | 'folder') {
    if (isShortcutFolder(shortcut)) {
      setOpenFolderId(shortcut.id);
      setSurfaceStatus(`${source === 'root' ? 'Root grid' : 'Folder panel'}: opened folder "${shortcut.title}".`);
      return;
    }

    setSurfaceStatus(`${source === 'root' ? 'Root grid' : 'Folder panel'}: selected "${shortcut.title}".`);
  }

  return (
    <main className="reference-shell">
      <section className="reference-stage">
        <header className="reference-stage__intro">
          <div>
            <p className="reference-eyebrow">Official reference example</p>
            <h1>Leaftab-like host</h1>
            <p className="reference-stage__lede">
              This page keeps the focus on the actual shortcut workspace: the root grid, the folder panel,
              LeafTab preset sizing, and the real merge / extract drag flow.
            </p>
          </div>

          <div className="reference-stage__stats" aria-label="Example stats">
            <article className="reference-stat">
              <span>Root links</span>
              <strong>{linkCount}</strong>
            </article>
            <article className="reference-stat">
              <span>Root folders</span>
              <strong>{folderCount}</strong>
            </article>
            <article className="reference-stat">
              <span>Open folder items</span>
              <strong>{activeFolder ? folderShortcuts.length : 0}</strong>
            </article>
          </div>
        </header>

        <div className="reference-layout">
          <section className="desktop-frame">
            <div className="desktop-frame__chrome">
              <div className="desktop-frame__traffic" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>

              <div className="desktop-frame__summary">
                <p className="reference-eyebrow">Root surface</p>
                <h2>Grid-first reference layout</h2>
              </div>

              <div className="desktop-frame__controls">
                {!compactViewport ? (
                  <div className="density-switch" aria-label="Desktop column density">
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
                  className="reference-action"
                  onClick={() => {
                    setShortcuts(INITIAL_SHORTCUTS);
                    setOpenFolderId('folder-launch');
                    setExternalDragSession(null);
                    setSurfaceStatus('Workspace reset to the reference shortcut set.', 'success');
                  }}
                >
                  Reset workspace
                </button>
              </div>
            </div>

            <div className="desktop-frame__surface">
              <div className="desktop-frame__surface-head">
                <div>
                  <span>Root shortcut grid</span>
                  <strong>{gridColumns} columns · preset metrics · drag enabled</strong>
                </div>
                <p className={`surface-status surface-status--${statusTone}`}>{status}</p>
              </div>

              <div ref={rootGridFrameRef} className="desktop-frame__grid">
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
                  onShortcutOpen={(shortcut) => handleShortcutOpen(shortcut, 'root')}
                  onShortcutContextMenu={(event) => event.preventDefault()}
                  onShortcutReorder={(nextShortcuts) => {
                    updateShortcuts(nextShortcuts);
                    setSurfaceStatus('Root grid: reordered shortcuts.', 'success');
                  }}
                  onShortcutDropIntent={handleRootDropIntent}
                  externalDragSession={externalDragSession}
                  onExternalDragSessionConsumed={(token) => {
                    if (externalDragSession?.token === token) {
                      setExternalDragSession(null);
                    }
                  }}
                  renderItem={rootGridPreset.renderItem}
                  renderDragPreview={rootGridPreset.renderDragPreview}
                  renderCenterPreview={rootGridPreset.renderCenterPreview}
                  renderDropPreview={rootGridPreset.renderDropPreview}
                />
              </div>
            </div>
          </section>

          <aside className="reference-sidebar">
            <section className="folder-panel">
              <div className="folder-panel__head">
                <div>
                  <p className="reference-eyebrow">Folder surface</p>
                  <h3>{activeFolder ? activeFolder.title : 'Open a folder'}</h3>
                </div>
                <span>{activeFolder ? `${folderShortcuts.length} items` : 'Secondary panel'}</span>
              </div>

              <div ref={folderMaskRef} className="folder-panel__viewport">
                {activeFolder ? (
                  <FolderShortcutSurface
                    folderId={activeFolder.id}
                    shortcuts={folderShortcuts}
                    columns={4}
                    columnGap={12}
                    rowGap={12}
                    maskBoundaryRef={folderMaskRef}
                    resolveItemLayout={folderSurfacePreset.resolveItemLayout}
                    onShortcutOpen={(shortcut) => handleShortcutOpen(shortcut, 'folder')}
                    onShortcutContextMenu={(event) => event.preventDefault()}
                    onShortcutDropIntent={handleFolderDropIntent}
                    onExtractDragStart={handleFolderExtractDragStart}
                    renderItem={folderSurfacePreset.renderItem}
                    renderDragPreview={folderSurfacePreset.renderDragPreview}
                    renderDropPreview={folderSurfacePreset.renderDropPreview}
                  />
                ) : (
                  <div className="folder-panel__empty">
                    <h4>No folder selected</h4>
                    <p>Open a folder tile in the root grid to inspect its children and test extraction back to root.</p>
                  </div>
                )}
              </div>
            </section>

            <section className="reference-notes">
              <article className="reference-note">
                <span>Preset sizing</span>
                <strong>{LEAFTAB_COMPACT_GRID_METRICS.iconSize}px icon tiles with {LEAFTAB_COMPACT_GRID_METRICS.largeFolderGridSpan}x{LEAFTAB_COMPACT_GRID_METRICS.largeFolderGridSpan} large-folder spans.</strong>
              </article>
              <article className="reference-note">
                <span>Merge behavior</span>
                <strong>Drop on the icon center to merge, or ride the edge regions to reorder cleanly.</strong>
              </article>
              <article className="reference-note">
                <span>Extraction flow</span>
                <strong>Drag a child out of the folder panel and the root surface immediately takes over the session.</strong>
              </article>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
