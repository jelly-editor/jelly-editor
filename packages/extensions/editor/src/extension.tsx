import type { Extension, ExtensionContext } from "@jelly/sdk";
import { ipc } from "@jelly/ipc";
import { EditorPane } from "./ui/EditorPane";
import { EditorEncoding, EditorIndent, EditorPath } from "./ui/StatusItems";
import { useEditorStore } from "./store";
import { saveActive } from "./save";

export const editorExtension: Extension = {
  manifest: {
    id: "jelly.editor",
    name: "Editor",
    version: "1.0.0",
    contributes: {
      commands: [
        { id: "editor.open", title: "Open File", palette: false },
        { id: "editor.openDiff", title: "Open Diff", palette: false },
        { id: "editor.save", title: "Save File" },
        { id: "editor.closeFile", title: "Close File" },
        { id: "editor.closeActiveTab", title: "Close Tab", palette: false },
      ],
      keybindings: [
        { command: "editor.save", key: "mod+s", when: "workspaceOpen" },
        { command: "editor.closeActiveTab", key: "mod+w", when: "workspaceOpen" },
      ],
    },
  },

  activate(ctx: ExtensionContext) {
    const store = useEditorStore;

    ctx.subscriptions.push(
      ctx.commands.register(
        "editor.open",
        async (path: string, name: string, opts?: { pin?: boolean; line?: number }) => {
          const ed = store.getState();
          // Always leave any diff view when opening a standard file.
          ed.setActiveDiff(null);

          if (opts?.pin) ed.openPinned(path, name);
          else ed.openPreview(path, name);
          if (ed.getContent(path) === undefined) {
            try {
              const content = await ipc.fs.read(path);
              const threshold = ctx.settings.get<number>("editor.largeFileThreshold") ?? 1_048_576;
              if (content.length > threshold) ed.markLargeFile(path);
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
        store.getState().setActiveDiff(diff),
      ),
      ctx.commands.register("editor.save", () => saveActive()),
      ctx.commands.register("editor.closeActiveTab", () => store.getState().requestCloseActive()),
      ctx.commands.register("editor.closeFile", (path?: string) =>
        store.getState().closeTab(path ?? store.getState().activeTabPath ?? ""),
      ),
    );

    // A file or folder was renamed/moved in the tree — remap any open tabs so
    // their paths (and the diffs/buffers keyed by them) follow the change.
    ctx.subscriptions.push(
      ctx.events.on<{ from: string; to: string }>("files:renamed", ({ from, to }) =>
        store.getState().applyRename(from, to),
      ),
    );

    // Announce the active file (file-tree highlight, status bar) and the open
    // diff (git panel row highlight) so other extensions can follow along.
    let prevActive = store.getState().activeTabPath;
    let prevDiff = store.getState().activeDiff?.path ?? null;
    const unsub = store.subscribe((s) => {
      if (s.activeTabPath !== prevActive) {
        prevActive = s.activeTabPath;
        ctx.events.emit("editor:active_changed", { path: s.activeTabPath });
      }
      const diffPath = s.activeDiff?.path ?? null;
      if (diffPath !== prevDiff) {
        prevDiff = diffPath;
        ctx.events.emit("editor:diff_changed", { path: diffPath });
      }
    });
    ctx.subscriptions.push({ dispose: unsub });

    // Flag open files that changed on disk outside the editor.
    ctx.subscriptions.push(
      ctx.events.on<{ path: string }>("file:changed_externally", async ({ path }) => {
        const ed = store.getState();
        if (!ed.tabs.some((t) => t.path === path)) return;
        try {
          const onDisk = await ipc.fs.read(path);
          if (onDisk !== ed.savedContents.get(path)) ed.markExternalChange(path);
        } catch {
          /* file may have been removed mid-flight — ignore */
        }
      }),
    );

    ctx.ui.mountSlot("editor.surface", <EditorPane ctx={ctx} />, { id: "editor.main" });
    ctx.ui.contributeStatusBarItem({ id: "editor.path", align: "left", order: 20, render: () => <EditorPath /> });
    ctx.ui.contributeStatusBarItem({ id: "editor.encoding", align: "right", order: 10, render: () => <EditorEncoding /> });
    ctx.ui.contributeStatusBarItem({ id: "editor.indent", align: "right", order: 20, render: () => <EditorIndent /> });
  },
};
