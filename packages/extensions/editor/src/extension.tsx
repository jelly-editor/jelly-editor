import type { Extension, ExtensionContext } from "@jelly/sdk";
import { ipc } from "@jelly/ipc";
import { foldAll, unfoldAll } from "@codemirror/language";
import type { EditorView } from "@codemirror/view";
import { foldNearest, unfoldNearest } from "./fold";
import { EditorPane } from "./ui/EditorPane";
import { EditorEncoding, EditorIndent, EditorPath } from "./ui/StatusItems";
import { useEditorStore } from "./store";
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
        { id: "editor.openDiff", title: "Open Diff", palette: false },
        { id: "editor.save", title: "Save File" },
        { id: "editor.closeFile", title: "Close File" },
        { id: "editor.closeActiveTab", title: "Close Tab", palette: false },
        { id: "editor.fold", title: "Fold" },
        { id: "editor.unfold", title: "Unfold" },
        { id: "editor.foldAll", title: "Fold All" },
        { id: "editor.unfoldAll", title: "Unfold All" },
      ],
      keybindings: [
        { command: "editor.save", key: "mod+s", when: "workspaceOpen" },
        { command: "editor.closeActiveTab", key: "mod+w", when: "workspaceOpen" },
        { command: "editor.fold", key: "mod+alt+[", when: "workspaceOpen" },
        { command: "editor.unfold", key: "mod+alt+]", when: "workspaceOpen" },
        { command: "editor.foldAll", key: "mod+k mod+0", when: "workspaceOpen" },
        { command: "editor.unfoldAll", key: "mod+k mod+j", when: "workspaceOpen" },
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

    // Reconcile open files that changed on disk outside the editor. With no
    // unsaved edits we adopt the new contents silently; otherwise we surface a
    // notification so the user chooses between their edits and the disk version.
    ctx.subscriptions.push(
      ctx.events.on<{ path: string }>("file:changed_externally", async ({ path }) => {
        const ed = store.getState();
        const tab = ed.tabs.find((t) => t.path === path);
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

    ctx.ui.mountSlot("editor.surface", <EditorPane ctx={ctx} />, { id: "editor.main" });
    ctx.ui.contributeStatusBarItem({ id: "editor.path", align: "left", order: 20, render: () => <EditorPath /> });
    ctx.ui.contributeStatusBarItem({ id: "editor.encoding", align: "right", order: 10, render: () => <EditorEncoding /> });
    ctx.ui.contributeStatusBarItem({ id: "editor.indent", align: "right", order: 20, render: () => <EditorIndent /> });
  },
};
