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
const PAGES_DOC_URL = `${GRID_REPO_URL}/blob/main/docs/github-pages-showcase.md`;

type DemoLogEntry = {
  id: string;
  tone: 'info' | 'success' | 'accent';
  text: string;
};

const FEATURE_CALLOUTS = [
  {
    title: 'Desktop-style reorder',
    body: 'The root surface preserves grid intent instead of collapsing into a list-like drag model.',
  },
  {
    title: 'Folder-aware merge',
    body: 'Center drops create or target folders, while edge-biased drops stay in reorder mode.',
  },
  {
    title: 'Continuous extraction',
    body: 'Dragging a child out of a folder can continue as a root-grid session without breaking pointer flow.',
  },
] as const;

const PACKAGE_SUMMARIES = [
  {
    name: '@leaftab/grid-core',
    summary: 'Pure layout, drag, and tree-operation logic.',
    install: 'npm install @leaftab/grid-core',
  },
  {
    name: '@leaftab/grid-react',
    summary: 'Production-style React adapters for root and folder surfaces.',
    install: 'npm install @leaftab/grid-react',
  },
] as const;

const WORKFLOW_STEPS = [
  'Change the shared behavior in `leaftab-grid` first.',
  'Validate the package layer with `npm run verify`.',
  'Use the GitHub Pages showcase as a human-readable behavior demo.',
  'Then rebuild LeafTab, which consumes this repo during co-development.',
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
  const rowHeight = compactViewport ? 102 : 122;
  const rowGap = compactViewport ? 14 : 18;
  const columnGap = compactViewport ? 14 : 18;
  const containerHeight = compactViewport ? 540 : 620;

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
          <a href="#playground">Playground</a>
          <a href="#packages">Packages</a>
          <a href="#origin">Origin</a>
          <a href={PAGES_DOC_URL} target="_blank" rel="noreferrer">Pages guide</a>
        </div>
      </nav>

      <header className="hero-card" id="top">
        <div className="hero-card__copy">
          <p className="eyebrow">Leaftab Grid GitHub Pages Showcase</p>
          <h1>Desktop-style shortcut grids, extracted from LeafTab and staged as a live playground.</h1>
          <p className="hero-card__lede">
            This repo now ships with a Pages-ready demo that highlights the behaviors that made the
            original LeafTab shortcut surface feel native: root-grid reorder, folder merge, folder
            extraction, and span-aware placement for large folder tiles.
          </p>

          <div className="hero-card__actions">
            <a className="cta cta-primary" href={GRID_REPO_URL} target="_blank" rel="noreferrer">
              View grid source
            </a>
            <a className="cta cta-secondary" href={LEAFTAB_REPO_URL} target="_blank" rel="noreferrer">
              View LeafTab origin
            </a>
          </div>

          <ul className="hero-card__chips" aria-label="Grid capabilities">
            <li>Root reorder</li>
            <li>Merge into folders</li>
            <li>Folder extraction</li>
            <li>Large tile packing</li>
            <li>React adapters</li>
          </ul>
        </div>

        <div className="hero-card__stats">
          <div className="stat-card">
            <span>Root items</span>
            <strong>{shortcuts.length}</strong>
          </div>
          <div className="stat-card">
            <span>Total links</span>
            <strong>{linkCount}</strong>
          </div>
          <div className="stat-card">
            <span>Folders</span>
            <strong>{folderCount}</strong>
          </div>
        </div>
      </header>

      <section className="feature-band" aria-label="Core feature callouts">
        {FEATURE_CALLOUTS.map((feature) => (
          <article key={feature.title} className="feature-band__card">
            <p className="eyebrow">Why it matters</p>
            <h2>{feature.title}</h2>
            <p>{feature.body}</p>
          </article>
        ))}
      </section>

      <main className="showcase-layout">
        <section className="surface-panel" id="playground">
          <div className="surface-panel__header">
            <div>
              <p className="eyebrow">Interactive Surface</p>
              <h2>Try the exact interaction contract that powers the extracted engine.</h2>
            </div>

            <div className="surface-panel__controls">
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

          <div className="playground-grid">
            <div className="surface-canvas">
              <div className="surface-canvas__toolbar">
                <span>Root surface</span>
                <span>{compactViewport ? 'Mobile-fit layout' : `Desktop layout: ${gridColumns} columns`}</span>
              </div>

              <div className="surface-canvas__viewport">
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

            <div className="folder-dock">
              <div className="surface-canvas__toolbar">
                <span>Folder surface</span>
                <span>{activeFolder ? activeFolder.title : 'Click a folder to inspect it'}</span>
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
                      Reorder children here, or drag one outside the panel to promote it back into
                      the root surface with a continuous pointer session.
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
                    <p className="eyebrow">What to try</p>
                    <h3>Open a folder or create a new one by merging two links.</h3>
                    <p>
                      The small folder demonstrates compact reorder logic. The large folder shows
                      span-aware packing and how the root surface preserves big tiles while smaller
                      items move around them.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="info-rail">
          <section className="info-card">
            <p className="eyebrow">Behavior Checklist</p>
            <h3>Recommended interactions</h3>
            <ul className="task-list">
              <li>Drag a root shortcut to a leading edge to reorder without merging.</li>
              <li>Drop one link on top of another to create a folder.</li>
              <li>Open a folder and reorder children inside the compact surface.</li>
              <li>Drag a folder child out of the panel and release in the root grid.</li>
              <li>Notice how the large folder keeps its span-aware footprint.</li>
            </ul>
          </section>

          <section className="info-card">
            <p className="eyebrow">Origin</p>
            <h3>Extracted from the LeafTab new-tab extension</h3>
            <p>
              Leaftab Grid is the open-source grid engine that was split out of LeafTab. The product
              repo and live browser distributions stay linked here so the relationship is explicit.
            </p>

            <div className="link-stack">
              <a href={LEAFTAB_REPO_URL} target="_blank" rel="noreferrer">LeafTab GitHub repository</a>
              <a href={LEAFTAB_CHROME_URL} target="_blank" rel="noreferrer">LeafTab on Chrome Web Store</a>
              <a href={LEAFTAB_EDGE_URL} target="_blank" rel="noreferrer">LeafTab on Edge Add-ons</a>
              <a href={LEAFTAB_FIREFOX_URL} target="_blank" rel="noreferrer">LeafTab on Firefox Add-ons</a>
            </div>
          </section>

          <section className="info-card">
            <p className="eyebrow">Event Log</p>
            <h3>Latest interaction outcomes</h3>
            <div className="event-log" aria-live="polite">
              {logs.map((entry) => (
                <div key={entry.id} className={`event-log__item event-log__item--${entry.tone}`}>
                  {entry.text}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </main>

      <section className="knowledge-grid">
        <article className="knowledge-card" id="packages">
          <p className="eyebrow">Packages</p>
          <h2>Two packages, one interaction contract.</h2>
          <div className="package-grid">
            {PACKAGE_SUMMARIES.map((pkg) => (
              <div key={pkg.name} className="package-card">
                <strong>{pkg.name}</strong>
                <p>{pkg.summary}</p>
                <code>{pkg.install}</code>
              </div>
            ))}
          </div>
        </article>

        <article className="knowledge-card">
          <p className="eyebrow">Workflow</p>
          <h2>How this repo fits into the larger LeafTab development loop.</h2>
          <ol className="workflow-list">
            {WORKFLOW_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="knowledge-card__actions">
            <a className="cta cta-secondary" href={RULES_DOC_URL} target="_blank" rel="noreferrer">
              Read behavior rules
            </a>
            <a className="cta cta-secondary" href={PAGES_DOC_URL} target="_blank" rel="noreferrer">
              Read Pages guide
            </a>
          </div>
        </article>

        <article className="knowledge-card" id="origin">
          <p className="eyebrow">Open-source origin</p>
          <h2>Leaftab Grid comes from the production shortcut system inside LeafTab.</h2>
          <p>
            The purpose of this repository is to keep the grid engine, drag logic, and reusable React
            adapters evolving in one open place, while the full new-tab product can continue shipping
            on top of it.
          </p>
          <div className="link-stack">
            <a href={GRID_REPO_URL} target="_blank" rel="noreferrer">Leaftab Grid repository</a>
            <a href={LEAFTAB_REPO_URL} target="_blank" rel="noreferrer">LeafTab repository</a>
            <a href={LEAFTAB_CHROME_URL} target="_blank" rel="noreferrer">LeafTab on Chrome Web Store</a>
            <a href={LEAFTAB_EDGE_URL} target="_blank" rel="noreferrer">LeafTab on Edge Add-ons</a>
            <a href={LEAFTAB_FIREFOX_URL} target="_blank" rel="noreferrer">LeafTab on Firefox Add-ons</a>
          </div>
        </article>
      </section>

      <footer className="showcase-footer">
        <p>
          Leaftab Grid is GPL-3.0-or-later and stays aligned with the main LeafTab project license.
        </p>
        <a href={GRID_REPO_URL} target="_blank" rel="noreferrer">
          github.com/mason173/leaftab-grid
        </a>
      </footer>
    </div>
  );
}
