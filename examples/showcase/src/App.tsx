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

const LEAFTAB_REPO_URL = 'https://github.com/mason173/LeafTab';
const LEAFTAB_CHROME_URL = 'https://chromewebstore.google.com/detail/leaftab/lfogogokkkpmolbfbklchcbgdiboccdf?hl=zh-CN&gl=DE';
const LEAFTAB_EDGE_URL = 'https://microsoftedge.microsoft.com/addons/detail/leaftab/nfbdmggppgfmfbaddobdhdleppgffphn';
const LEAFTAB_FIREFOX_URL = 'https://addons.mozilla.org/zh-CN/firefox/addon/leaftab/';
const GRID_REPO_URL = 'https://github.com/mason173/leaftab-workspace';
const RULES_DOC_URL = `${GRID_REPO_URL}/blob/main/docs/compact-grid-rules.md`;

type DemoLogEntry = {
  id: string;
  tone: 'info' | 'success' | 'accent';
  text: string;
};

const DEMO_NOTES = [
  '拖动卡片到边缘，看真正的 grid reorder，而不是列表排序。',
  '把一个链接压到另一个链接中心，直接合并成文件夹。',
  '打开文件夹后，把子项从右侧面板拖回根网格。',
  '大文件夹会保留它的占位，不会把布局挤乱。',
] as const;

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
    ],
  },
  createLink('linear', 'Linear', 'https://linear.app', 'Li', '#312e81'),
  createLink('slack', 'Slack', 'https://slack.com', 'Sl', '#6b21a8'),
  {
    id: 'folder-launch',
    title: 'Launch Pad',
    url: '',
    icon: 'LP',
    kind: 'folder',
    folderDisplayMode: 'large',
    children: [
      createLink('leaftab', 'LeafTab', 'https://github.com/mason173/LeafTab', 'LT', '#14532d'),
      createLink('storybook', 'Storybook', 'https://storybook.js.org', 'Sb', '#831843'),
      createLink('playwright', 'Playwright', 'https://playwright.dev', 'Pw', '#14532d'),
      createLink('astro', 'Astro', 'https://astro.build', 'As', '#7c2d12'),
      createLink('vercel', 'Vercel', 'https://vercel.com', 'Ve', '#111827'),
      createLink('chrome', 'Chrome', 'https://developer.chrome.com', 'Ch', '#1d4ed8'),
      createLink('firefox', 'Firefox', 'https://www.mozilla.org/firefox', 'Fx', '#9a3412'),
      createLink('edge', 'Edge', 'https://www.microsoft.com/edge', 'Ed', '#0f766e'),
      createLink('arc', 'Arc', 'https://arc.net', 'Ar', '#7c3aed'),
    ],
  },
  createLink('analytics', 'Analytics', 'https://plausible.io', 'An', '#164e63'),
  createLink('roadmap', 'Roadmap', 'https://trello.com', 'Rm', '#0c4a6e'),
];

const DESKTOP_COLUMNS = [5, 6, 7] as const;

export function App() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(INITIAL_SHORTCUTS);
  const [openFolderId, setOpenFolderId] = useState<string | null>('folder-launch');
  const [preferredColumns, setPreferredColumns] = useState<(typeof DESKTOP_COLUMNS)[number]>(6);
  const [externalDragSession, setExternalDragSession] = useState<RootShortcutExternalDragSession | null>(null);
  const [logs, setLogs] = useState<DemoLogEntry[]>([
    {
      id: 'boot-1',
      tone: 'success',
      text: 'Demo ready. Try reordering cards, merging two links into a folder, or dragging a child back out to the root grid.',
    },
    {
      id: 'boot-2',
      tone: 'info',
      text: 'This showcase runs the open-source grid packages directly, not a simplified mock.',
    },
  ]);
  const [viewportWidth, setViewportWidth] = useState(() => (
    typeof window === 'undefined' ? 1280 : window.innerWidth
  ));

  const folderMaskRef = useRef<HTMLDivElement | null>(null);
  const rootGridFrameRef = useRef<HTMLDivElement | null>(null);
  const dragTokenRef = useRef(0);
  const [gridWidthPx, setGridWidthPx] = useState<number | null>(null);

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

  const compactViewport = viewportWidth < 980;
  const gridColumns = compactViewport ? 4 : preferredColumns;
  const rowHeight = LEAFTAB_COMPACT_GRID_METRICS.iconSize + LEAFTAB_COMPACT_GRID_METRICS.titleBlockHeight;
  const rowGap = compactViewport ? 16 : LEAFTAB_COMPACT_GRID_METRICS.rowGap;
  const columnGap = LEAFTAB_COMPACT_GRID_METRICS.columnGap;
  const containerHeight = compactViewport ? 620 : 720;
  const largeFolderEnabled = gridColumns >= 2;
  const largeFolderPreviewSize = useMemo(() => computeLeaftabLargeFolderPreviewSize({
    gridWidthPx,
    gridColumns,
    compactIconSize: LEAFTAB_COMPACT_GRID_METRICS.iconSize,
    columnGap,
    rowGap,
    largeFolderEnabled,
  }), [columnGap, gridColumns, gridWidthPx, largeFolderEnabled, rowGap]);

  const openFolder = openFolderId ? findShortcutById(shortcuts, openFolderId) : null;
  const activeFolder = isShortcutFolder(openFolder) ? openFolder : null;
  const folderShortcuts = activeFolder ? getShortcutChildren(activeFolder) : [];
  const folderCount = shortcuts.filter(isShortcutFolder).length;
  const linkCount = countShortcutLinks(shortcuts);

  useEffect(() => {
    if (openFolderId && !activeFolder) {
      setOpenFolderId(null);
    }
  }, [activeFolder, openFolderId]);

  function pushLog(text: string, tone: DemoLogEntry['tone'] = 'info') {
    setLogs((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        tone,
        text,
      },
      ...current,
    ].slice(0, 8));
  }

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
        pushLog(`${sourceLabel}: shortcut tree updated.`, 'success');
        return;
      case 'request-folder-merge': {
        const result = mergeShortcutsIntoNewFolder(
          shortcuts,
          ROOT_SHORTCUTS_PATH,
          [outcome.activeShortcutId, outcome.targetShortcutId],
          createFolderFromMerge,
        );
        if (!result) {
          pushLog(`${sourceLabel}: merge request could not be applied.`, 'accent');
          return;
        }
        updateShortcuts(result.nextShortcuts);
        setOpenFolderId(result.folder.id);
        pushLog(`${sourceLabel}: merged two root links into folder "${result.folder.title}".`, 'success');
        return;
      }
      case 'start-root-drag-session': {
        dragTokenRef.current += 1;
        updateShortcuts(outcome.shortcuts);
        if (outcome.closeFolderId && outcome.closeFolderId === openFolderId) {
          setOpenFolderId(null);
        }
        setExternalDragSession({
          ...outcome.session,
          token: dragTokenRef.current,
        });
        pushLog(`${sourceLabel}: extracted a folder child back into the root surface.`, 'success');
        return;
      }
      case 'unsupported-tree':
        pushLog(`${sourceLabel}: nested folders are intentionally outside the first open-source contract.`, 'accent');
        return;
      case 'noop':
        pushLog(`${sourceLabel}: no state change was needed.`, 'info');
        return;
      default:
        return;
    }
  }

  function handleRootDropIntent(intent: Parameters<typeof applyShortcutDropIntent>[1]) {
    applyInteraction(applyShortcutDropIntent(shortcuts, intent), 'Root grid');
  }

  function handleFolderDropIntent(intent: Parameters<typeof applyShortcutDropIntent>[1]) {
    applyInteraction(applyShortcutDropIntent(shortcuts, intent), 'Folder surface');
  }

  function handleFolderExtractDragStart(payload: Parameters<typeof applyFolderExtractDragStart>[1]) {
    applyInteraction(applyFolderExtractDragStart(shortcuts, payload), 'Folder surface');
  }

  function handleShortcutOpen(shortcut: Shortcut, source: 'root' | 'folder') {
    if (isShortcutFolder(shortcut)) {
      setOpenFolderId(shortcut.id);
      pushLog(`${source === 'root' ? 'Root grid' : 'Folder surface'}: opened folder "${shortcut.title}".`, 'info');
      return;
    }

    pushLog(`${source === 'root' ? 'Root grid' : 'Folder surface'}: selected link "${shortcut.title}".`, 'info');
  }

  function handleRootReorder(nextShortcuts: Shortcut[]) {
    updateShortcuts(nextShortcuts);
    pushLog('Root grid: reordered shortcuts without a custom drop intent handler.', 'info');
  }

  function handleResetDemo() {
    setShortcuts(INITIAL_SHORTCUTS);
    setOpenFolderId('folder-launch');
    setExternalDragSession(null);
    pushLog('Demo reset to the curated LeafTab-derived dataset.', 'success');
  }

  const rootGridPreset = useMemo(() => createLeaftabRootGridPreset({
    getRootRect: () => rootGridFrameRef.current?.getBoundingClientRect(),
    gridWidthPx: gridWidthPx ?? 0,
    gridColumns,
    rowHeight,
    rowGap,
    columnGap,
    largeFolderPreviewSize,
    largeFolderEnabled,
    compactFallbackLargeFolderPreviewSize: compactViewport ? 156 : 188,
    dropPreviewBorderRadius: '26px',
  }), [columnGap, compactViewport, gridColumns, gridWidthPx, largeFolderEnabled, largeFolderPreviewSize, rowGap, rowHeight]);

  const folderSurfacePreset = useMemo(() => createLeaftabFolderSurfacePreset({
    largeFolderPreviewSize,
    dropPreviewBorderRadius: '24px',
  }), [largeFolderPreviewSize]);

  return (
    <div className="showcase-shell">
      <nav className="topbar" aria-label="Showcase navigation">
        <a className="topbar__brand" href="#top">
          <span className="topbar__mark">LG</span>
          <span>Leaftab Workspace</span>
        </a>

        <div className="topbar__links">
          <a href="#demo">Grid Demo</a>
          <a href="#folder">Folder Panel</a>
          <a href={RULES_DOC_URL} target="_blank" rel="noreferrer">Rules</a>
        </div>
      </nav>

      <main className="showcase-main">
        <section className="hero-stage" id="top">
          <div className="hero-stage__copy">
            <p className="eyebrow">LeafTab-derived Compact Grid</p>
            <h1>页面主角就是这块根网格。</h1>
            <p className="hero-stage__lede">
              这版把展示内容压到最低，只保留和真实使用感有关的部分。图标尺寸、标题块、列间距、大文件夹 `2x2`
              占位、拖拽命中区域，都尽量向 LeafTab 里的 compact grid 靠拢。
            </p>
          </div>

          <div className="hero-stage__meta">
            <div className="hero-metric">
              <span>Items</span>
              <strong>{shortcuts.length}</strong>
            </div>
            <div className="hero-metric">
              <span>Links</span>
              <strong>{linkCount}</strong>
            </div>
            <div className="hero-metric">
              <span>Folders</span>
              <strong>{folderCount}</strong>
            </div>
          </div>
        </section>

        <section className="workspace-stage" id="demo">
          <div className="workspace-stage__header">
            <div>
              <p className="eyebrow">Primary Demo</p>
              <h2>先看根网格怎么排，再看旁边的补充行为。</h2>
            </div>

            <div className="workspace-stage__controls">
              <div className="segmented-control" aria-label="Desktop columns">
                {DESKTOP_COLUMNS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={value === preferredColumns ? 'is-active' : undefined}
                    onClick={() => setPreferredColumns(value)}
                    disabled={compactViewport}
                  >
                    {value} cols
                  </button>
                ))}
              </div>

              <button type="button" className="cta cta-ghost" onClick={handleResetDemo}>
                Reset demo
              </button>
            </div>
          </div>

          <div className="workspace-stage__grid">
            <section className="workspace-surface">
              <div className="workspace-surface__chrome">
                <span>Root grid</span>
                <span>{compactViewport ? 'Compact mobile fit' : `Compact desktop · ${gridColumns} columns`}</span>
              </div>

              <div ref={rootGridFrameRef} className="workspace-surface__canvas">
                <RootShortcutGrid
                  containerHeight={containerHeight}
                  shortcuts={shortcuts}
                  gridColumns={gridColumns}
                  minRows={4}
                  rowHeight={rowHeight}
                  rowGap={rowGap}
                  columnGap={columnGap}
                  resolveItemLayout={rootGridPreset.resolveItemLayout}
                  onShortcutOpen={(shortcut) => handleShortcutOpen(shortcut, 'root')}
                  onShortcutContextMenu={(event, _shortcutIndex, shortcut) => {
                    event.preventDefault();
                    pushLog(`Root grid: context menu opened for "${shortcut.title}".`, 'info');
                  }}
                  onShortcutReorder={handleRootReorder}
                  onShortcutDropIntent={handleRootDropIntent}
                  externalDragSession={externalDragSession}
                  onExternalDragSessionConsumed={(token) => {
                    if (externalDragSession?.token === token) {
                      setExternalDragSession(null);
                    }
                  }}
                  resolveCompactTargetRegions={rootGridPreset.resolveCompactTargetRegions}
                  resolveDropTargetRects={rootGridPreset.resolveDropTargetRects}
                  renderItem={rootGridPreset.renderItem}
                  renderDragPreview={rootGridPreset.renderDragPreview}
                  renderCenterPreview={rootGridPreset.renderCenterPreview}
                  renderDropPreview={rootGridPreset.renderDropPreview}
                />
              </div>

              <div className="workspace-surface__notes">
                {DEMO_NOTES.map((note) => (
                  <div key={note} className="workspace-note">
                    {note}
                  </div>
                ))}
              </div>
            </section>

            <aside className="workspace-rail">
              <section className="folder-dock" id="folder">
                <div className="workspace-surface__chrome">
                  <span>Folder panel</span>
                  <span>{activeFolder ? activeFolder.title : 'Click a folder in the grid'}</span>
                </div>

                <div ref={folderMaskRef} className="folder-dock__viewport">
                  {activeFolder ? (
                    <>
                      <div className="folder-dock__headline">
                        <div>
                          <p className="eyebrow">Open Folder</p>
                          <h3>{activeFolder.title}</h3>
                        </div>
                        <button
                          type="button"
                          className="cta cta-ghost"
                          onClick={() => setOpenFolderId(null)}
                        >
                          Close
                        </button>
                      </div>

                      <p className="folder-dock__hint">
                        这里专门用来补充文件夹内部排序，以及从文件夹拖回根网格的连续拖拽。
                      </p>

                      <FolderShortcutSurface
                        folderId={activeFolder.id}
                        shortcuts={folderShortcuts}
                        columns={compactViewport ? 3 : 4}
                        columnGap={compactViewport ? 12 : 14}
                        rowGap={compactViewport ? 12 : 14}
                        maskBoundaryRef={folderMaskRef}
                        resolveItemLayout={folderSurfacePreset.resolveItemLayout}
                        onShortcutOpen={(shortcut) => handleShortcutOpen(shortcut, 'folder')}
                        onShortcutContextMenu={(event, shortcut) => {
                          event.preventDefault();
                          pushLog(`Folder surface: context menu opened for "${shortcut.title}".`, 'info');
                        }}
                        onShortcutDropIntent={handleFolderDropIntent}
                        onExtractDragStart={handleFolderExtractDragStart}
                        renderItem={folderSurfacePreset.renderItem}
                        renderDragPreview={folderSurfacePreset.renderDragPreview}
                        renderDropPreview={folderSurfacePreset.renderDropPreview}
                      />
                    </>
                  ) : (
                    <div className="folder-empty">
                      <p className="eyebrow">Folder Behavior</p>
                      <h3>点左边任何一个文件夹。</h3>
                      <p>这里会显示它内部的排序和拖拽行为，但页面重点始终是左边的根网格。</p>
                    </div>
                  )}
                </div>
              </section>

              <section className="info-card info-card--dense">
                <p className="eyebrow">Live Log</p>
                <h3>交互反馈</h3>
                <div className="event-log" aria-live="polite">
                  {logs.map((entry) => (
                    <div key={entry.id} className={`event-log__item event-log__item--${entry.tone}`}>
                      {entry.text}
                    </div>
                  ))}
                </div>
              </section>

              <section className="info-card info-card--dense">
                <p className="eyebrow">Origin</p>
                <h3>从 LeafTab 拆出来的开源网格。</h3>
                <p>真正的来源和分发链接放在这里，避免抢主视觉，但仍然方便直接跳转。</p>
                <div className="link-stack">
                  <a href={GRID_REPO_URL} target="_blank" rel="noreferrer">Leaftab Workspace GitHub</a>
                  <a href={LEAFTAB_REPO_URL} target="_blank" rel="noreferrer">LeafTab GitHub</a>
                  <a href={LEAFTAB_CHROME_URL} target="_blank" rel="noreferrer">Chrome Web Store</a>
                  <a href={LEAFTAB_EDGE_URL} target="_blank" rel="noreferrer">Edge Add-ons</a>
                  <a href={LEAFTAB_FIREFOX_URL} target="_blank" rel="noreferrer">Firefox Add-ons</a>
                </div>
              </section>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
