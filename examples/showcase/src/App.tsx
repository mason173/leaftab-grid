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
} from '@leaftab/grid-core';
import {
  FolderShortcutSurface,
  RootShortcutGrid,
  type FolderShortcutSurfaceRenderDragPreviewParams,
  type FolderShortcutSurfaceRenderItemParams,
  type RootShortcutExternalDragSession,
  type RootShortcutGridRenderCenterPreviewParams,
  type RootShortcutGridRenderDragPreviewParams,
  type RootShortcutGridRenderItemParams,
} from '@leaftab/grid-react';
import { startTransition, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';

const LEAFTAB_REPO_URL = 'https://github.com/mason173/LeafTab';
const LEAFTAB_CHROME_URL = 'https://chromewebstore.google.com/detail/leaftab/lfogogokkkpmolbfbklchcbgdiboccdf?hl=zh-CN&gl=DE';
const LEAFTAB_EDGE_URL = 'https://microsoftedge.microsoft.com/addons/detail/leaftab/nfbdmggppgfmfbaddobdhdleppgffphn';
const LEAFTAB_FIREFOX_URL = 'https://addons.mozilla.org/zh-CN/firefox/addon/leaftab/';
const GRID_REPO_URL = 'https://github.com/mason173/leaftab-grid';
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
    ],
  },
  createLink('analytics', 'Analytics', 'https://plausible.io', 'An', '#164e63'),
  createLink('roadmap', 'Roadmap', 'https://trello.com', 'Rm', '#0c4a6e'),
];

const DESKTOP_COLUMNS = [5, 6, 7] as const;

export function App() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(INITIAL_SHORTCUTS);
  const [openFolderId, setOpenFolderId] = useState<string | null>('folder-build');
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
  const dragTokenRef = useRef(0);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const compactViewport = viewportWidth < 980;
  const gridColumns = compactViewport ? 4 : preferredColumns;
  const rowHeight = compactViewport ? 108 : 132;
  const rowGap = compactViewport ? 14 : 20;
  const columnGap = compactViewport ? 14 : 20;
  const containerHeight = compactViewport ? 600 : 760;

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
    setOpenFolderId('folder-build');
    setExternalDragSession(null);
    pushLog('Demo reset to the curated LeafTab-derived dataset.', 'success');
  }

  function resolveRootLayout(shortcut: Shortcut) {
    if (isShortcutFolder(shortcut) && shortcut.folderDisplayMode === 'large') {
      return {
        width: compactViewport ? 160 : 228,
        height: compactViewport ? 178 : 262,
        columnSpan: 2,
        rowSpan: 2,
        preserveSlot: true,
        previewBorderRadius: compactViewport ? '28px' : '34px',
      };
    }

    return {
      width: compactViewport ? 72 : 90,
      height: compactViewport ? 88 : 104,
      previewBorderRadius: compactViewport ? '22px' : '26px',
    };
  }

  function resolveFolderLayout() {
    return {
      width: compactViewport ? 72 : 84,
      height: compactViewport ? 88 : 98,
      previewBorderRadius: compactViewport ? '22px' : '24px',
    };
  }

  function renderShortcutCard(
    shortcut: Shortcut,
    options: {
      mode: 'root' | 'folder' | 'preview' | 'merge-preview';
      centerPreviewActive?: boolean;
      compact?: boolean;
    },
  ) {
    const folder = isShortcutFolder(shortcut);
    const children = folder ? getShortcutChildren(shortcut).slice(0, 4) : [];
    const tone = shortcut.iconColor ?? '#1f2937';

    return (
      <div
        className={[
          'shortcut-card',
          folder ? 'shortcut-card-folder' : 'shortcut-card-link',
          options.mode === 'preview' ? 'shortcut-card-preview' : '',
          options.mode === 'merge-preview' ? 'shortcut-card-merge' : '',
          options.centerPreviewActive ? 'shortcut-card-center-active' : '',
          options.compact ? 'shortcut-card-compact' : '',
        ].filter(Boolean).join(' ')}
      >
        <div
          className="shortcut-card__icon"
          style={{
            background: folder
              ? 'linear-gradient(135deg, rgba(254, 240, 138, 0.95), rgba(249, 115, 22, 0.9))'
              : `linear-gradient(135deg, color-mix(in srgb, ${tone} 84%, white 16%), color-mix(in srgb, ${tone} 62%, black 38%))`,
            color: folder ? '#451a03' : '#f8fafc',
          }}
        >
          {folder ? (
            <div className="shortcut-folder-icon">
              {children.slice(0, 4).map((child) => (
                <span
                  key={child.id}
                  className="shortcut-folder-icon__chip"
                  style={{ backgroundColor: child.iconColor ?? '#0f172a' }}
                >
                  {child.icon.slice(0, 1)}
                </span>
              ))}
            </div>
          ) : (
            <span>{shortcut.icon}</span>
          )}
        </div>

        <div className="shortcut-card__meta">
          <strong>{shortcut.title}</strong>
          <span>
            {folder
              ? `${getShortcutChildren(shortcut).length} child shortcuts`
              : shortcut.url.replace(/^https?:\/\//, '')}
          </span>
        </div>

        {folder ? (
          <div className="shortcut-card__badge">
            {shortcut.folderDisplayMode === 'large' ? 'Large folder' : 'Folder'}
          </div>
        ) : null}
      </div>
    );
  }

  function renderRootItem(params: RootShortcutGridRenderItemParams) {
    return (
      <button
        type="button"
        className="shortcut-button"
        onClick={params.onOpen}
        onContextMenu={(event) => params.onContextMenu(event as unknown as ReactMouseEvent<HTMLDivElement>)}
      >
        {renderShortcutCard(params.shortcut, {
          mode: 'root',
          centerPreviewActive: params.centerPreviewActive,
          compact: compactViewport,
        })}
      </button>
    );
  }

  function renderRootPreview(params: RootShortcutGridRenderDragPreviewParams) {
    return renderShortcutCard(params.shortcut, {
      mode: 'preview',
      compact: compactViewport,
    });
  }

  function renderMergePreview(params: RootShortcutGridRenderCenterPreviewParams) {
    return (
      <div className="merge-preview">
        <span className="merge-preview__eyebrow">Drop to merge</span>
        {renderShortcutCard(params.shortcut, {
          mode: 'merge-preview',
          compact: compactViewport,
        })}
      </div>
    );
  }

  function renderFolderItem(params: FolderShortcutSurfaceRenderItemParams) {
    return (
      <button
        type="button"
        className="shortcut-button"
        onClick={params.onOpen}
        onContextMenu={(event) => params.onContextMenu(event as unknown as ReactMouseEvent<HTMLDivElement>)}
      >
        {renderShortcutCard(params.shortcut, {
          mode: params.isDragging ? 'preview' : 'folder',
          compact: compactViewport,
        })}
      </button>
    );
  }

  function renderFolderPreview(params: FolderShortcutSurfaceRenderDragPreviewParams) {
    return renderShortcutCard(params.shortcut, {
      mode: 'preview',
      compact: compactViewport,
    });
  }

  return (
    <div className="showcase-shell">
      <div className="showcase-backdrop" />

      <nav className="topbar" aria-label="Showcase navigation">
        <a className="topbar__brand" href="#top">
          <span className="topbar__mark">LG</span>
          <span>Leaftab Grid</span>
        </a>

        <div className="topbar__links">
          <a href="#demo">Demo</a>
          <a href="#source">Source</a>
          <a href={RULES_DOC_URL} target="_blank" rel="noreferrer">Rules</a>
        </div>
      </nav>

      <header className="hero-card hero-card--focused" id="top">
        <div className="hero-card__copy">
          <p className="eyebrow">Leaftab Grid Showcase</p>
          <h1>首屏先看网格本体，不先看文案。</h1>
          <p className="hero-card__lede">
            这个站现在把主界面提到最前面。核心展示就是根网格如何排布、如何合并文件夹、如何把文件夹子项再拖回根网格，以及大文件夹如何稳定占位。
          </p>

          <div className="hero-card__actions">
            <a className="cta cta-primary" href="#demo">
              直接看 Demo
            </a>
            <a className="cta cta-secondary" href={GRID_REPO_URL} target="_blank" rel="noreferrer">
              查看仓库
            </a>
          </div>
        </div>

        <div className="hero-card__stats hero-card__stats--inline">
          <div className="stat-card">
            <span>Root Items</span>
            <strong>{shortcuts.length}</strong>
          </div>
          <div className="stat-card">
            <span>Total Links</span>
            <strong>{linkCount}</strong>
          </div>
          <div className="stat-card">
            <span>Folders</span>
            <strong>{folderCount}</strong>
          </div>
        </div>
      </header>

      <main className="showcase-main">
        <section className="demo-stage" id="demo">
          <div className="demo-stage__canvas">
            <div className="demo-stage__toolbar">
              <div>
                <p className="eyebrow">Primary Interface</p>
                <h2>这就是主界面，网格系统本身就是主角。</h2>
              </div>

              <div className="demo-stage__controls">
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
                  Reset
                </button>
              </div>
            </div>

            <div className="surface-canvas surface-canvas--hero">
              <div className="surface-canvas__toolbar">
                <span>Root grid</span>
                <span>{compactViewport ? 'Mobile-fit layout' : `Desktop layout · ${gridColumns} columns`}</span>
              </div>

              <div className="surface-canvas__viewport surface-canvas__viewport--hero">
                <RootShortcutGrid
                  containerHeight={containerHeight}
                  shortcuts={shortcuts}
                  gridColumns={gridColumns}
                  minRows={4}
                  rowHeight={rowHeight}
                  rowGap={rowGap}
                  columnGap={columnGap}
                  resolveItemLayout={resolveRootLayout}
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
                  renderItem={renderRootItem}
                  renderDragPreview={renderRootPreview}
                  renderCenterPreview={renderMergePreview}
                  renderDropPreview={(preview) => (
                    <div
                      aria-hidden="true"
                      className="drop-preview"
                      style={{
                        left: preview.left,
                        top: preview.top,
                        width: preview.width,
                        height: preview.height,
                        borderRadius: preview.borderRadius ?? '26px',
                      }}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          <aside className="demo-stage__rail">
            <section className="info-card info-card--dense">
              <p className="eyebrow">Focus</p>
              <h3>看这四件事就够了</h3>
              <ul className="task-list task-list--stacked">
                {DEMO_NOTES.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </section>

            <section className="folder-dock folder-dock--hero">
              <div className="surface-canvas__toolbar">
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
                      右侧只负责补充展示文件夹内部的行为，真正的主视觉还是左边的根网格。
                    </p>

                    <FolderShortcutSurface
                      folderId={activeFolder.id}
                      shortcuts={folderShortcuts}
                      columns={compactViewport ? 3 : 4}
                      columnGap={compactViewport ? 12 : 14}
                      rowGap={compactViewport ? 12 : 14}
                      maskBoundaryRef={folderMaskRef}
                      resolveItemLayout={resolveFolderLayout}
                      onShortcutOpen={(shortcut) => handleShortcutOpen(shortcut, 'folder')}
                      onShortcutContextMenu={(event, shortcut) => {
                        event.preventDefault();
                        pushLog(`Folder surface: context menu opened for "${shortcut.title}".`, 'info');
                      }}
                      onShortcutDropIntent={handleFolderDropIntent}
                      onExtractDragStart={handleFolderExtractDragStart}
                      renderItem={renderFolderItem}
                      renderDragPreview={renderFolderPreview}
                      renderDropPreview={(preview) => (
                        <div
                          aria-hidden="true"
                          className="drop-preview"
                          style={{
                            left: preview.left,
                            top: preview.top,
                            width: preview.width,
                            height: preview.height,
                            borderRadius: preview.borderRadius ?? '24px',
                          }}
                        />
                      )}
                    />
                  </>
                ) : (
                  <div className="folder-empty">
                    <p className="eyebrow">Folder Behavior</p>
                    <h3>点左边网格里的文件夹。</h3>
                    <p>
                      这里会显示文件夹内部的重排，以及拖出到根网格时的连续拖拽行为。
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="info-card info-card--dense">
              <p className="eyebrow">Live Log</p>
              <h3>交互结果</h3>
              <div className="event-log" aria-live="polite">
                {logs.map((entry) => (
                  <div key={entry.id} className={`event-log__item event-log__item--${entry.tone}`}>
                    {entry.text}
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>

        <section className="source-strip" id="source">
          <article className="source-card">
            <p className="eyebrow">Packages</p>
            <h3>两个包，围绕同一套交互规则。</h3>
            <p><code>@leaftab/grid-core</code> 负责布局、拖拽和树操作，<code>@leaftab/grid-react</code> 负责根网格和文件夹表面的 React 适配。</p>
          </article>

          <article className="source-card">
            <p className="eyebrow">Origin</p>
            <h3>它是从 LeafTab 抽出来的。</h3>
            <p>这个网格系统原本来自 LeafTab 新标签页产品，现在作为独立开源仓库继续演进。</p>
            <div className="link-stack">
              <a href={LEAFTAB_REPO_URL} target="_blank" rel="noreferrer">LeafTab GitHub</a>
              <a href={LEAFTAB_CHROME_URL} target="_blank" rel="noreferrer">Chrome Web Store</a>
              <a href={LEAFTAB_EDGE_URL} target="_blank" rel="noreferrer">Edge Add-ons</a>
              <a href={LEAFTAB_FIREFOX_URL} target="_blank" rel="noreferrer">Firefox Add-ons</a>
            </div>
          </article>

          <article className="source-card">
            <p className="eyebrow">Contract</p>
            <h3>行为规则单独维护。</h3>
            <p>如果后面要继续调拖拽命中、合并逻辑、桥接区或者大文件夹占位，这里有清晰的行为文档作为单一真相源。</p>
            <a className="cta cta-secondary" href={RULES_DOC_URL} target="_blank" rel="noreferrer">
              Read behavior rules
            </a>
          </article>
        </section>
      </main>
    </div>
  );
}
