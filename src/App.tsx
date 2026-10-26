import { useEffect, useReducer, useState, useCallback, useRef } from "react";
import { ask, message, open as openDialog } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { ThemeProvider } from "@/lib/theme";
import { PreferencesProvider, usePreferences } from "@/lib/preferences";
import { ResizeHandle } from "@/components/ResizeHandle";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FolderSidebar } from "@/components/FolderSidebar";
import { Pane } from "@/components/Pane";
import { TableOfContents } from "@/components/TableOfContents";
import { Toolbar } from "@/components/Toolbar";
import { CommandPalette } from "@/components/CommandPalette";
import { tauri, onCliTarget, onFolderChanged, onFileChanged, type AnnotatedFolder } from "@/lib/tauri";
import {
  createInitialState,
  reduce,
  getActivePane,
  getActiveTab,
  type SplitDirection,
} from "@/lib/workspace";
import { MOD, MOD_SHIFT } from "@/lib/platform";
import { translateMarkdownToChinese } from "@/lib/translate";
import { basename, cn } from "@/lib/utils";

const WELCOME = `# Welcome to Marky

A fast markdown viewer with folder support.

- Press **${MOD}K** to open the command palette and search files.
- Press **${MOD}O** to open a file. **${MOD}F** searches inside the open document.
- Add a folder from the sidebar; it stays available across sessions.
- **${MOD}\\\\** splits the active pane vertically. **${MOD_SHIFT}\\\\** splits horizontally.
- Drop a file onto the window to open it as a new tab.

Launch from the terminal:

\`\`\`bash
marky README.md       # open a file
marky ./docs/         # open a folder (auto-saved)
\`\`\`
`;

function AppShell() {
  const [state, dispatch] = useReducer(reduce, undefined, () => createInitialState(WELCOME));
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchPaneId, setSearchPaneId] = useState<string | null>(null);
  const [translatingTabId, setTranslatingTabId] = useState<string | null>(null);
  const [savingTabId, setSavingTabId] = useState<string | null>(null);
  const [savedPaths, setSavedPaths] = useState<Record<string, string>>({});
  const [folders, setFolders] = useState<AnnotatedFolder[]>([]);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const {
    zoomIn, zoomOut, zoomReset,
    sidebarLeftWidth, sidebarRightWidth,
    setSidebarWidth, resetSidebarWidth,
  } = usePreferences();

  const activeTab = getActiveTab(state);
  const activePane = getActivePane(state);
  const isSplit = state.panes.length > 1;

  const refreshFolders = useCallback(async () => {
    setFolders(await tauri.listFoldersGrouped());
    setSidebarRefresh((n) => n + 1);
  }, []);

  const openFile = useCallback(async (path: string) => {
    try {
      const text = await tauri.readFile(path);
      const title = basename(path);
      dispatch({ type: "OPEN_FILE", path, title, source: text });
    } catch (err) {
      console.error("failed to read file", err);
    }
  }, []);

  // Initial load.
  useEffect(() => {
    (async () => {
      const target = await tauri.getInitialTarget();
      if (target.kind === "file") openFile(target.path);
      if (target.kind === "folder") setSidebarRefresh((n) => n + 1);
      refreshFolders();
    })();
  }, [openFile, refreshFolders]);

  // Keep App-level folders in sync whenever folders are added/removed/changed.
  useEffect(() => {
    const off = onFolderChanged(() => {
      refreshFolders();
    });
    return () => {
      off.then((fn) => fn());
    };
  }, [refreshFolders]);

  // Re-read open files when they change on disk.
  useEffect(() => {
    const off = onFileChanged(async (paths) => {
      for (const tab of Object.values(state.tabs)) {
        if (tab.filePath && paths.includes(tab.filePath)) {
          try {
            const text = await tauri.readFile(tab.filePath);
            dispatch({ type: "UPDATE_TAB_SOURCE", tabId: tab.id, source: text });
          } catch {
            // File may have been deleted; ignore
          }
        }
      }
    });
    return () => {
      off.then((fn) => fn());
    };
  }, [state.tabs]);

  // CLI re-target via single-instance.
  useEffect(() => {
    const off = onCliTarget((t) => {
      if (t.kind === "file") openFile(t.path);
      if (t.kind === "folder") {
        // Sidebar will pick up the new folder via its own folder://changed
        // listener, but we also bump refreshNonce and scroll it into view.
        refreshFolders();
        setTimeout(() => {
          sidebarRef.current
            ?.querySelector(`#folder-${cssEscape(folderIdFromPath(t.path) ?? "")}`)
            ?.scrollIntoView({ block: "start" });
        }, 100);
      }
    });
    return () => {
      off.then((fn) => fn());
    };
  }, [openFile, refreshFolders]);

  // Map a path back to a folder id for scroll-into-view (best-effort).
  const [pathToFolderId, setPathToFolderId] = useState<Record<string, string>>({});
  useEffect(() => {
    const map: Record<string, string> = {};
    for (const f of folders) map[f.path] = f.id;
    setPathToFolderId(map);
  }, [folders]);
  function folderIdFromPath(p: string): string | null {
    return pathToFolderId[p] ?? null;
  }

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (meta && k === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (meta && k === "o") {
        e.preventDefault();
        handlePickFile();
      } else if (meta && k === "f") {
        e.preventDefault();
        setSearchPaneId(state.activePaneId);
      } else if (meta && e.key === "\\") {
        e.preventDefault();
        dispatch({ type: "SPLIT", direction: e.shiftKey ? "horizontal" : "vertical" });
      } else if (meta && k === "w") {
        e.preventDefault();
        const tabId = activePane.activeTabId;
        if (tabId) dispatch({ type: "CLOSE_TAB", tabId, paneId: activePane.id });
      } else if (meta && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        zoomIn();
      } else if (meta && e.key === "-") {
        e.preventDefault();
        zoomOut();
      } else if (meta && k === "0") {
        e.preventDefault();
        zoomReset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.activePaneId, activePane.activeTabId, activePane.id, zoomIn, zoomOut, zoomReset]);

  // File drop opens as new tab.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      const off = await getCurrentWebview().onDragDropEvent((e) => {
        if (e.payload.type === "drop" && e.payload.paths.length > 0) {
          openFile(e.payload.paths[0]);
        }
      });
      unlisten = off;
    })();
    return () => unlisten?.();
  }, [openFile]);

  const handlePickFile = async () => {
    const picked = await openDialog({
      multiple: false,
      filters: [{ name: "Markdown", extensions: ["md", "markdown", "mdx"] }],
    });
    if (typeof picked === "string") openFile(picked);
  };

  const handleTranslate = useCallback(async () => {
    if (!activeTab?.filePath || activeTab.translatedFrom || translatingTabId) return;
    setTranslatingTabId(activeTab.id);
    try {
      const translated = await translateMarkdownToChinese(activeTab.source);
      setSavedPaths({});
      dispatch({
        type: "OPEN_TRANSLATED",
        originPath: activeTab.filePath,
        title: `${basename(activeTab.filePath)}（中文）`,
        source: translated,
        paneId: state.activePaneId,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      await message(`Translation failed: ${detail}`, {
        title: "Translation failed",
        kind: "error",
      });
    } finally {
      setTranslatingTabId(null);
    }
  }, [activeTab, state.activePaneId, translatingTabId]);

  const handleSaveTranslation = useCallback(async () => {
    if (!activeTab?.translatedFrom) return;
    setSavingTabId(activeTab.id);
    try {
      let result = await tauri.saveTranslation({
        originalPath: activeTab.translatedFrom,
        content: activeTab.source,
        overwrite: false,
      });

      if (result.status === "exists") {
        const confirmed = await ask(
          `${basename(result.path)} already exists. Overwrite it?`,
          {
            title: "Overwrite translation",
            kind: "warning",
            okLabel: "Overwrite",
            cancelLabel: "Cancel",
          },
        );
        if (!confirmed) return;
        result = await tauri.saveTranslation({
          originalPath: activeTab.translatedFrom,
          content: activeTab.source,
          overwrite: true,
        });
      }

      if (result.status === "saved") {
        setSavedPaths((prev) => ({ ...prev, [activeTab.id]: result.path }));
        await message(result.path, { title: "Translation saved", kind: "info" });
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      await message(`Save failed: ${detail}`, { title: "Save failed", kind: "error" });
    } finally {
      setSavingTabId(null);
    }
  }, [activeTab]);

  const handleSplit = (d: SplitDirection) => dispatch({ type: "SPLIT", direction: d });
  const handleCloseSplit = () => dispatch({ type: "CLOSE_SPLIT" });
  const handleJumpToFolder = (folderId: string) => {
    sidebarRef.current
      ?.querySelector(`#folder-${cssEscape(folderId)}`)
      ?.scrollIntoView({ block: "start" });
  };

  const renderPane = (paneId: string) => {
    const pane = state.panes.find((p) => p.id === paneId)!;
    return (
      <Pane
        key={pane.id}
        pane={pane}
        tabs={state.tabs}
        isFocused={pane.id === state.activePaneId}
        onSelectTab={(tabId) => dispatch({ type: "SWITCH_TAB", paneId: pane.id, tabId })}
        onCloseTab={(tabId) => dispatch({ type: "CLOSE_TAB", tabId, paneId: pane.id })}
        onFocusPane={() => dispatch({ type: "FOCUS_PANE", paneId: pane.id })}
        searchOpen={searchPaneId === pane.id}
        onSearchClose={() => setSearchPaneId(null)}
      />
    );
  };

  return (
    <div className="flex h-full">
      <div ref={sidebarRef} className="flex h-full min-h-0 shrink-0" style={{ width: sidebarLeftWidth }}>
        <FolderSidebar
          activePath={activeTab?.filePath}
          onOpenFile={openFile}
          onOpenPalette={() => setPaletteOpen(true)}
          refreshNonce={sidebarRefresh}
        />
      </div>
      <ResizeHandle
        side="left"
        onResize={(w) => setSidebarWidth("left", w)}
        onReset={() => resetSidebarWidth("left")}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Toolbar
          documentLabel={
            activeTab?.filePath ??
            (activeTab?.translatedFrom ? activeTab.title : undefined)
          }
          onOpenFile={handlePickFile}
          onSplit={handleSplit}
          onCloseSplit={handleCloseSplit}
          isSplit={isSplit}
          onFind={() => setSearchPaneId(state.activePaneId)}
          onTranslate={handleTranslate}
          canTranslate={
            !!activeTab?.filePath && !activeTab.translatedFrom && translatingTabId === null
          }
          translating={translatingTabId === activeTab?.id}
          isTranslated={!!activeTab?.translatedFrom}
          onSaveTranslation={handleSaveTranslation}
          saving={savingTabId === activeTab?.id}
          savedPath={activeTab ? savedPaths[activeTab.id] : undefined}
        />
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1">
            <div
              className={cn(
                "flex h-full",
                state.split === "horizontal" ? "flex-col" : "flex-row"
              )}
            >
              {state.panes.map((p, i) => (
                <div key={p.id} className="flex min-h-0 min-w-0 flex-1">
                  {renderPane(p.id)}
                  {i < state.panes.length - 1 && (
                    <div
                      className={cn(
                        "shrink-0 bg-border",
                        state.split === "horizontal" ? "h-px w-full" : "h-full w-px"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </main>
          {!isSplit && (
            <>
              <ResizeHandle
                side="right"
                onResize={(w) => setSidebarWidth("right", w)}
                onReset={() => resetSidebarWidth("right")}
                className="hidden lg:flex"
              />
              <aside className="hidden shrink-0 border-l bg-card/30 lg:block" style={{ width: sidebarRightWidth }}>
                <TableOfContents source={activeTab?.source ?? ""} />
              </aside>
            </>
          )}
        </div>
      </div>
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onOpenFile={openFile}
        onSplit={handleSplit}
        onCloseSplit={handleCloseSplit}
        isSplit={isSplit}
        folders={folders}
        onJumpToFolder={handleJumpToFolder}
      />
    </div>
  );
}

function cssEscape(s: string): string {
  // Minimal escape for use in attribute selectors with UUID-like ids.
  return s.replace(/([^a-zA-Z0-9_-])/g, "\\$1");
}

export default function App() {
  return (
    <ThemeProvider>
      <PreferencesProvider>
        <TooltipProvider delayDuration={300}>
          <AppShell />
        </TooltipProvider>
      </PreferencesProvider>
    </ThemeProvider>
  );
}
