import type { Extension, ExtensionContext } from "@jelly/sdk";
import { ipc } from "@jelly/ipc";
import { foldAll, unfoldAll } from "@codemirror/language";
import type { EditorView } from "@codemirror/view";
import { foldNearest, unfoldNearest } from "./fold";
import { EditorPane } from "./ui/pane";
import { EditorEncoding, EditorIndent } from "./ui/StatusItems";
import { type LayoutNode, newPaneId, type Pane, type Side, type Tab, type ViewRenderer, useEditorStore, viewPath } from "./store";
import { saveActive } from "./save";
import { decideExternalChange } from "./reconcile";
import { getActiveView } from "./active-view";

/** Run a CodeMirror fold command against the currently mounted editor. */
function runFold(cmd: (view: EditorView) => boolean): void {
  const view = getActiveView();
  if (!view) return;
  cmd(view);
  view.focus();
}

export const editorExtension: Extension = {
  manifest: {
    id: "jelly.editor",
    name: "Editor",
    version: "1.0.0",
    contributes: {
      commands: [
        { id: "editor.open", title: "Open File", palette: false },
        { id: "editor.fileDragOver", title: "File Drag Over", palette: false },
        { id: "editor.fileDragLeave", title: "File Drag Leave", palette: false },
        { id: "editor.dropFilesAt", title: "Drop Files At", palette: false },
        { id: "editor.openDiff", title: "Open Diff", palette: false },
        { id: "editor.save", title: "Save File" },
        { id: "editor.closeFile", title: "Close File" },
        { id: "editor.closeActiveTab", title: "Close Tab", palette: false },
        { id: "editor.toggleViewType", title: "Toggle View Type", palette: false },
        { id: "editor.splitRight", title: "Split Editor Right" },
        { id: "editor.splitDown", title: "Split Editor Down" },
        { id: "editor.fold", title: "Fold" },
        { id: "editor.unfold", title: "Unfold" },
        { id: "editor.foldAll", title: "Fold All" },
        { id: "editor.unfoldAll", title: "Unfold All" },
      ],
      keybindings: [
        { command: "editor.save", key: "mod+s", when: "workspaceOpen" },
        { command: "editor.closeActiveTab", key: "mod+w", when: "workspaceOpen" },
        { command: "editor.splitRight", key: "mod+\\", when: "workspaceOpen" },
        { command: "editor.fold", key: "mod+alt+[", when: "workspaceOpen" },
        { command: "editor.unfold", key: "mod+alt+]", when: "workspaceOpen" },
        { command: "editor.foldAll", key: "mod+k mod+0", when: "workspaceOpen" },
        { command: "editor.unfoldAll", key: "mod+k mod+j", when: "workspaceOpen" },
      ],
    },
  },

  activate(ctx: ExtensionContext) {
    const store = useEditorStore;
    const largeFileThreshold = () =>
      ctx.settings.get<number>("editor.largeFileThreshold") ?? 1_048_576;
    const openPinned = async (path: string) => {
      await ctx.commands.execute("editor.open", path, path.slice(path.lastIndexOf("/") + 1), { pin: true });
    };

    const paneTargetAt = (x: number, y: number): { paneId: string; side: Side | null } | null => {
      const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-pane-id]");
      if (!el?.dataset.paneId) return null;
      const r = el.getBoundingClientRect();
      const fx = (x - r.left) / r.width;
      const fy = (y - r.top) / r.height;
      const m = Math.min(fx, 1 - fx, fy, 1 - fy);
      const side: Side | null =
        m >= 0.2 ? null : m === fx ? "left" : m === 1 - fx ? "right" : m === fy ? "top" : "bottom";
      return { paneId: el.dataset.paneId, side };
    };

    let lastOverKey = "";
    const setDragOver = (t: { paneId: string; side: Side | null } | null) => {
      const key = t ? `${t.paneId}:${t.side ?? ""}` : "";
      if (key === lastOverKey) return;
      lastOverKey = key;
      store.getState().setDragOver(t);
    };

    ctx.subscriptions.push(
      ctx.commands.register(
        "editor.open",
        async (path: string, name: string, opts?: { pin?: boolean; line?: number }) => {
          const ed = store.getState();
          if (opts?.pin) ed.openPinned(path, name);
          else ed.openPreview(path, name);
          if (ed.getContent(path) === undefined) {
            try {
              const content = await ipc.fs.read(path);
              if (content.length > largeFileThreshold()) ed.markLargeFile(path);
              ed.setSaved(path, content);
            } catch (e) {
              ed.setSaved(path, `// Could not open file: ${e}`);
            }
          }
          if (opts?.line !== undefined) {
            ed.requestReveal(path, opts.line);
          }
        },
      ),
      ctx.commands.register("editor.openDiff", (diff: { path: string; workspace: string }) =>
        store.getState().openDiff(diff),
      ),
      ctx.commands.register("editor.save", () => saveActive()),
      ctx.commands.register("editor.closeActiveTab", () => store.getState().requestCloseActive()),
      ctx.commands.register("editor.closeFile", (path?: string) => {
        const ed = store.getState();
        const target = path ?? ed.getActivePane().activeTabPath;
        if (target) ed.closeEverywhere(target);
      }),
      ctx.commands.register("editor.splitRight", () => store.getState().splitActive("right")),
      ctx.commands.register("editor.splitDown", () => store.getState().splitActive("down")),
      ctx.commands.register("editor.fileDragOver", (x: number, y: number) => setDragOver(paneTargetAt(x, y))),
      ctx.commands.register("editor.fileDragLeave", () => setDragOver(null)),
      ctx.commands.register("editor.dropFilesAt", async (paths: string[], x: number, y: number) => {
        const target = paneTargetAt(x, y);
        setDragOver(null);
        if (!target || !paths.length) return false;
        if (target.side) store.getState().splitOpen(target.paneId, target.side);
        else store.getState().setActivePane(target.paneId);
        for (const p of paths) await openPinned(p);
        return true;
      }),
      // Contributed pane views (e.g. terminals): other extensions register a
      // renderer and open/close instances through these commands — never imports.
      ctx.commands.register("editor.registerView", (viewType: string, render: ViewRenderer) =>
        store.getState().registerView(viewType, render),
      ),
      ctx.commands.register(
        "editor.openView",
        (viewType: string, viewId: string, title: string, placement?: "active" | "group-bottom") =>
          store.getState().openView(viewType, viewId, title, placement),
      ),
      ctx.commands.register("editor.closeView", (viewType: string, viewId: string) =>
        store.getState().closeEverywhere(viewPath(viewType, viewId)),
      ),
      ctx.commands.register("editor.toggleViewType", (viewType: string) =>
        store.getState().toggleViewType(viewType),
      ),
      ctx.commands.register("editor.fold", () => runFold(foldNearest)),
      ctx.commands.register("editor.unfold", () => runFold(unfoldNearest)),
      ctx.commands.register("editor.foldAll", () => runFold(foldAll)),
      ctx.commands.register("editor.unfoldAll", () => runFold(unfoldAll)),
    );

    // A file or folder was renamed/moved in the tree — remap any open tabs so
    // their paths (and the diffs/buffers keyed by them) follow the change.
    ctx.subscriptions.push(
      ctx.events.on<{ from: string; to: string }>("files:renamed", ({ from, to }) =>
        store.getState().applyRename(from, to),
      ),
    );

    // Announce the active file (file-tree highlight, status bar) and the open
    // diff (git panel row highlight) from the focused pane so other extensions
    // can follow along.
    const activePane = (s: ReturnType<typeof store.getState>) => s.panes[s.activePaneId];
    let prevActive = activePane(store.getState())?.activeTabPath ?? null;
    let prevDiff = activePane(store.getState())?.activeDiff?.path ?? null;
    const unsub = store.subscribe((s) => {
      const pane = activePane(s);
      const active = pane?.activeTabPath ?? null;
      if (active !== prevActive) {
        prevActive = active;
        ctx.events.emit("editor:active_changed", { path: active });
      }
      const diffPath = pane?.activeDiff?.path ?? null;
      if (diffPath !== prevDiff) {
        prevDiff = diffPath;
        ctx.events.emit("editor:diff_changed", { path: diffPath });
      }
    });
    ctx.subscriptions.push({ dispose: unsub });

    // Tell a view's owner (e.g. the terminal extension) when its tab is gone, so
    // it can tear the instance down.
    const collectViews = (s: ReturnType<typeof store.getState>) => {
      const m = new Map<string, { viewType: string; viewId: string }>();
      for (const p of Object.values(s.panes)) {
        for (const t of p.tabs) {
          if (t.kind === "view" && t.viewType && t.viewId) m.set(t.path, { viewType: t.viewType, viewId: t.viewId });
        }
      }
      return m;
    };
    let prevViews = collectViews(store.getState());
    ctx.subscriptions.push({
      dispose: store.subscribe((s) => {
        const cur = collectViews(s);
        for (const [path, v] of prevViews) {
          if (!cur.has(path)) ctx.events.emit("editor:view_closed", v);
        }
        prevViews = cur;
      }),
    });

    // Reconcile open files that changed on disk outside the editor. With no
    // unsaved edits we adopt the new contents silently; otherwise we surface a
    // notification so the user chooses between their edits and the disk version.
    ctx.subscriptions.push(
      ctx.events.on<{ path: string }>("file:changed_externally", async ({ path }) => {
        const ed = store.getState();
        const tab = Object.values(ed.panes).flatMap((p) => p.tabs).find((t) => t.path === path);
        try {
          const onDisk = await ipc.fs.read(path);
          const outcome = decideExternalChange({
            isOpen: !!tab,
            isDirty: !!tab?.isDirty,
            onDisk,
            saved: ed.savedContents.get(path),
            alreadyNotified: ed.externallyChanged.has(path),
          });
          if (outcome === "ignore" || !tab) return;

          if (outcome === "reload") {
            ed.setSaved(path, onDisk); // clean buffer — adopt disk version
            return;
          }

          ed.markExternalChange(path);
          ctx.notifications.warn(`${tab.name} changed on disk, but you have unsaved changes.`, {
            source: "Editor",
            actions: [
              {
                label: "Reload",
                variant: "primary",
                run: async () => {
                  try {
                    store.getState().setSaved(path, await ipc.fs.read(path));
                  } catch {
                    store.getState().clearExternalChange(path);
                  }
                },
              },
              { label: "Keep Mine", run: () => store.getState().clearExternalChange(path) },
            ],
          });
        } catch {
          /* file may have been removed mid-flight — ignore */
        }
      }),
    );

    // Persist the pane layout per workspace and restore it on the next launch.
    let workspacePath: string | null = null;
    let restoring = false;
    let saveTimer: ReturnType<typeof setTimeout> | undefined;

    type SavedTab = {
      path: string;
      name: string;
      dirty?: string;
      kind?: "file" | "view";
      viewType?: string;
      viewId?: string;
    };
    type SavedNode =
      | { kind: "leaf"; tabs: SavedTab[]; active: string | null; focused: boolean }
      | { kind: "split"; dir: "row" | "column"; sizes: number[]; children: SavedNode[] };
    type SavedState = { root: SavedNode };

    const serialize = (node: LayoutNode, s: ReturnType<typeof store.getState>): SavedNode => {
      if (node.type === "leaf") {
        const p = s.panes[node.paneId];
        return {
          kind: "leaf",
          tabs: (p?.tabs ?? []).map((t) => ({
            path: t.path,
            name: t.name,
            dirty: t.kind === "view" ? undefined : t.isDirty ? s.getContent(t.path) : undefined,
            kind: t.kind,
            viewType: t.viewType,
            viewId: t.viewId,
          })),
          active: p?.activeTabPath ?? null,
          focused: node.paneId === s.activePaneId,
        };
      }
      return { kind: "split", dir: node.dir, sizes: node.sizes, children: node.children.map((c) => serialize(c, s)) };
    };

    const saveTabs = () => {
      if (!workspacePath || restoring) return;
      const ws = workspacePath;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const s = store.getState();
        void ctx.storage.set<SavedState>(`tabs:${ws}`, { root: serialize(s.root, s) });
      }, 300);
    };

    const restoreTabs = async (ws: string) => {
      workspacePath = ws;
      const saved = await ctx.storage.get<SavedState>(`tabs:${ws}`).catch(() => undefined);
      if (!saved?.root) return;
      restoring = true;
      try {
        const fileContents = new Map(store.getState().fileContents);
        const savedContents = new Map(store.getState().savedContents);
        const largeFiles = new Set(store.getState().largeFiles);
        const threshold = largeFileThreshold();
        const dirtyApply: { path: string; dirty: string }[] = [];
        const panes: Record<string, Pane> = {};
        let focusedPaneId: string | null = null;
        let tabCount = 0;

        const build = async (sn: SavedNode): Promise<LayoutNode> => {
          if (sn.kind === "split") {
            const children: LayoutNode[] = [];
            for (const c of sn.children) children.push(await build(c));
            return { type: "split", id: `split-r-${children.length}-${Math.random().toString(36).slice(2, 8)}`, dir: sn.dir, sizes: sn.sizes, children };
          }
          const tabs: Tab[] = [];
          for (const t of sn.tabs) {
            if (t.kind === "view") {
              if (!t.viewType || !t.viewId) continue;
              tabs.push({
                path: t.path,
                name: t.name,
                isDirty: false,
                isPinned: true,
                isPreview: false,
                kind: "view",
                viewType: t.viewType,
                viewId: t.viewId,
              });
              continue;
            }

            if (!fileContents.has(t.path)) {
              let content: string;
              try {
                content = await ipc.fs.read(t.path); // skip files that no longer exist
              } catch {
                continue;
              }
              if (content.length > threshold) largeFiles.add(t.path);
              fileContents.set(t.path, content);
              savedContents.set(t.path, content);
            }
            tabs.push({ path: t.path, name: t.name, isDirty: false, isPinned: true, isPreview: false });
            if (t.dirty !== undefined) dirtyApply.push({ path: t.path, dirty: t.dirty });
          }
          tabCount += tabs.length;
          const id = newPaneId();
          const active = tabs.some((t) => t.path === sn.active) ? sn.active : tabs[tabs.length - 1]?.path ?? null;
          panes[id] = { id, tabs, activeTabPath: active, activeDiff: null };
          if (sn.focused) focusedPaneId = id;
          return { type: "leaf", paneId: id };
        };

        const root = await build(saved.root);
        if (tabCount === 0) return;

        const ids = Object.keys(panes);
        store.setState({
          root,
          panes,
          activePaneId: focusedPaneId ?? ids[0],
          fileContents,
          savedContents,
          largeFiles,
          hiddenPaneIds: new Set(),
        });
        for (const d of dirtyApply) store.getState().updateBuffer(d.path, d.dirty);
      } finally {
        restoring = false;
        saveTabs();
      }
    };

    let lastRoot = store.getState().root;
    let lastPanes = store.getState().panes;
    let lastActivePane = store.getState().activePaneId;
    ctx.subscriptions.push(
      ctx.events.on<{ path: string }>("workspace:opened", ({ path }) => void restoreTabs(path)),
      { dispose: () => clearTimeout(saveTimer) },
      {
        dispose: store.subscribe((s) => {
          if (s.root === lastRoot && s.panes === lastPanes && s.activePaneId === lastActivePane) return;
          lastRoot = s.root;
          lastPanes = s.panes;
          lastActivePane = s.activePaneId;
          saveTabs();
        }),
      },
    );

    // Native (cross-window) file drops onto a pane open the file there; dropping
    // near an edge splits the pane. The explorer starts the drag and records the
    // paths in the shared drag session.
    let incomingPaths: string[] | null = null;
    let incomingRead = false;
    let dropDisposed = false;
    let unlistenDrop: (() => void) | undefined;
    void ipc.drag
      .onDrop(async (e) => {
        if (e.phase === "leave") {
          incomingPaths = null;
          incomingRead = false;
          setDragOver(null);
          return;
        }
        if (!incomingRead) {
          incomingRead = true;
          incomingPaths = (await ipc.drag.readSession())?.paths ?? null;
        }
        if (e.phase === "enter") return;
        const target = paneTargetAt(e.x, e.y);
        if (e.phase === "over") return setDragOver(target);

        setDragOver(null);
        const paths = incomingPaths?.length ? incomingPaths : e.paths;
        incomingPaths = null;
        incomingRead = false;
        if (!target || !paths.length) return;
        if (target.side) store.getState().splitOpen(target.paneId, target.side);
        else store.getState().setActivePane(target.paneId);
        for (const p of paths) await openPinned(p);
      })
      .then((un) => (dropDisposed ? un() : (unlistenDrop = un)));
    ctx.subscriptions.push({ dispose: () => ((dropDisposed = true), unlistenDrop?.()) });

    ctx.ui.mountSlot("editor.surface", <EditorPane ctx={ctx} />, { id: "editor.main" });
    ctx.ui.contributeStatusBarItem({ id: "editor.encoding", align: "right", order: 10, render: () => <EditorEncoding /> });
    ctx.ui.contributeStatusBarItem({ id: "editor.indent", align: "right", order: 20, render: () => <EditorIndent /> });
  },
};
