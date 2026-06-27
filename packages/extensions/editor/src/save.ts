import { ipc } from "@jelly/ipc";
import { useEditorStore } from "./store";

/** Save a specific tab's buffer to disk. */
export async function saveTab(path: string): Promise<void> {
  const ed = useEditorStore.getState();
  const content = ed.getContent(path);
  if (content === undefined) return;
  try {
    await ipc.fs.save(path, content);
    ed.setSaved(path, content);
  } catch {
    /* ignore — surfaced elsewhere */
  }
}

/** Save the active tab, if any. */
export function saveActive(): Promise<void> | void {
  const path = useEditorStore.getState().activeTabPath;
  if (path) return saveTab(path);
}
