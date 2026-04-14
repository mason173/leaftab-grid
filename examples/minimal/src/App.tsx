import {
  ROOT_SHORTCUTS_PATH,
  applyFolderExtractDragStart,
  applyShortcutDropIntent,
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
  startTransition,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';

const ICON_SIZE = 72;
const TITLE_BLOCK_HEIGHT = 24;
const COLUMN_GAP = 12;
const ROW_GAP = 20;

function createLink(id: string, title: string, url: string, icon: string, iconColor: string): Shortcut {
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
];

export function App() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(INITIAL_SHORTCUTS);
  const [openFolderId, setOpenFolderId] = useState<string | null>('folder-build');
  const [externalDragSession, setExternalDragSession] = useState<RootShortcutExternalDragSession | null>(null);
  const folderMaskRef = useRef<HTMLDivElement | null>(null);

  const openFolder = openFolderId ? findShortcutById(shortcuts, openFolderId) : null;
  const activeFolder = isShortcutFolder(openFolder) ? openFolder : null;
  const folderShortcuts = activeFolder ? getShortcutChildren(activeFolder) : [];

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

  function createFolderFromMerge(children: Shortcut[]) {
    return {
      id: `folder-${crypto.randomUUID()}`,
      title: children.map((child) => child.title).slice(0, 2).join(' + '),
      url: '',
      icon: 'FD',
      kind: 'folder' as const,
      folderDisplayMode: 'small' as const,
      children,
    };
  }

  function applyInteraction(
    outcome: ReturnType<typeof applyShortcutDropIntent> | ReturnType<typeof applyFolderExtractDragStart>,
  ) {
    switch (outcome.kind) {
      case 'update-shortcuts':
        updateShortcuts(outcome.shortcuts);
        return;
      case 'request-folder-merge': {
        const result = mergeShortcutsIntoNewFolder(
          shortcuts,
          ROOT_SHORTCUTS_PATH,
          [outcome.activeShortcutId, outcome.targetShortcutId],
          createFolderFromMerge,
        );
        if (!result) return;
        updateShortcuts(result.nextShortcuts);
        setOpenFolderId(result.folder.id);
        return;
      }
      case 'start-root-drag-session':
        updateShortcuts(outcome.shortcuts);
        setExternalDragSession({
          ...outcome.session,
          token: Date.now(),
        });
        return;
      default:
        return;
    }
  }

  function renderShortcutCard(shortcut: Shortcut) {
    const folder = isShortcutFolder(shortcut);
    const children = folder ? getShortcutChildren(shortcut).slice(0, 4) : [];

    return (
      <div className="mini-card">
        <div className="mini-card__preview">
          {folder ? (
            <div className="mini-folder">
              {children.map((child) => (
                <span
                  key={child.id}
                  className="mini-folder__chip"
                  style={{ backgroundColor: child.iconColor ?? '#cbd5e1' }}
                >
                  {child.icon.slice(0, 1)}
                </span>
              ))}
            </div>
          ) : (
            <div
              className="mini-icon"
              style={{ color: shortcut.iconColor ?? '#111827' }}
            >
              {shortcut.icon}
            </div>
          )}
        </div>
        <p className="mini-card__title">{shortcut.title}</p>
      </div>
    );
  }

  return (
    <main className="mini-shell">
      <section className="mini-column">
        <div className="mini-header">
          <div>
            <p className="mini-eyebrow">Minimal Root Grid</p>
            <h1>Leaftab Workspace minimal integration</h1>
          </div>
          <button
            type="button"
            className="mini-button"
            onClick={() => {
              setShortcuts(INITIAL_SHORTCUTS);
              setOpenFolderId('folder-build');
              setExternalDragSession(null);
            }}
          >
            Reset
          </button>
        </div>

        <div className="mini-surface">
          <RootShortcutGrid
            containerHeight={520}
            shortcuts={shortcuts}
            gridColumns={4}
            minRows={3}
            rowHeight={ICON_SIZE + TITLE_BLOCK_HEIGHT}
            rowGap={ROW_GAP}
            columnGap={COLUMN_GAP}
            resolveItemLayout={() => ({
              width: ICON_SIZE,
              height: ICON_SIZE + TITLE_BLOCK_HEIGHT,
              previewBorderRadius: '18px',
            })}
            onShortcutOpen={(shortcut) => {
              if (isShortcutFolder(shortcut)) {
                setOpenFolderId(shortcut.id);
              }
            }}
            onShortcutContextMenu={(event) => event.preventDefault()}
            onShortcutReorder={(nextShortcuts) => updateShortcuts(nextShortcuts)}
            onShortcutDropIntent={(intent) => applyInteraction(applyShortcutDropIntent(shortcuts, intent))}
            externalDragSession={externalDragSession}
            onExternalDragSessionConsumed={(token) => {
              if (externalDragSession?.token === token) {
                setExternalDragSession(null);
              }
            }}
            renderItem={(params) => (
              <button
                type="button"
                className="mini-card-button"
                onClick={params.onOpen}
                onContextMenu={(event) => params.onContextMenu(event as unknown as ReactMouseEvent<HTMLDivElement>)}
              >
                {renderShortcutCard(params.shortcut)}
              </button>
            )}
            renderDragPreview={(params) => renderShortcutCard(params.shortcut)}
          />
        </div>
      </section>

      <aside className="mini-column mini-column--aside">
        <div className="mini-header">
          <div>
            <p className="mini-eyebrow">Folder Surface</p>
            <h2>{activeFolder ? activeFolder.title : 'Open a folder'}</h2>
          </div>
        </div>

        <div ref={folderMaskRef} className="mini-surface mini-surface--aside">
          {activeFolder ? (
            <FolderShortcutSurface
              folderId={activeFolder.id}
              shortcuts={folderShortcuts}
              columns={3}
              columnGap={12}
              rowGap={12}
              maskBoundaryRef={folderMaskRef}
              resolveItemLayout={() => ({
                width: ICON_SIZE,
                height: ICON_SIZE + TITLE_BLOCK_HEIGHT,
                previewBorderRadius: '18px',
              })}
              onShortcutOpen={() => {}}
              onShortcutContextMenu={(event) => event.preventDefault()}
              onShortcutDropIntent={(intent) => applyInteraction(applyShortcutDropIntent(shortcuts, intent))}
              onExtractDragStart={(payload) => applyInteraction(applyFolderExtractDragStart(shortcuts, payload))}
              renderItem={(params) => (
                <button
                  type="button"
                  className="mini-card-button"
                  onClick={params.onOpen}
                  onContextMenu={(event) => params.onContextMenu(event as unknown as ReactMouseEvent<HTMLDivElement>)}
                >
                  {renderShortcutCard(params.shortcut)}
                </button>
              )}
              renderDragPreview={(params) => renderShortcutCard(params.shortcut)}
            />
          ) : (
            <p className="mini-empty">Click a folder tile in the root grid to inspect its contents.</p>
          )}
        </div>
      </aside>
    </main>
  );
}
