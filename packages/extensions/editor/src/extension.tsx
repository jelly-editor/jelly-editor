import type { Extension, ExtensionContext } from "@jelly/sdk";
import { ipc } from "@jelly/ipc";
import { EditorPane } from "./ui/EditorPane";
import { EditorEncoding, EditorIndent, EditorPath } from "./ui/StatusItems";
import { useEditorStore } from "./store";

export const editorExtension: Extension = {
  manifest: {
    id: "jelly.editor",
    name: "Editor",
    version: "1.0.0",
    contributes: {
      commands: [
        { id: "editor.open", title: "Open File" },
        { id: "editor.openDiff", title: "Open Diff" },
        { id: "editor.closeFile", title: "Close File" },
        { id: "editor.renameFile", title: "Rename File" },
      ],
    },
  },

  activate(ctx: ExtensionContext) {
    const store = useEditorStore;

    ctx.subscriptions.push(
      ctx.commands.register(
        "editor.open",
        async (path: string, name: string, opts?: { pin?: boolean }) => {
          const ed = store.getState();
          if (opts?.pin) ed.openPinned(path, name);
          else ed.openPreview(path, name);
          if (ed.getContent(path) === undefined) {
            try {
              const content = await ipc.fs.read(path);
              ed.setSaved(path, content);
            } catch (e) {
              ed.setSaved(path, `// Could not open file: ${e}`);
            }
          }
        },
      ),
      ctx.commands.register("editor.openDiff", (diff: { path: string; workspace: string }) =>
        store.getState().setActiveDiff(diff),
      ),
      ctx.commands.register("editor.closeFile", (path: string) =>
        store.getState().closeTab(path),
      ),
      ctx.commands.register("editor.renameFile", (from: string, to: string, name: string) =>
        store.getState().renameTab(from, to, name),
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
