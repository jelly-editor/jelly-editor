import type { ExtensionContext } from "@jelly/sdk";
import { useSetting } from "@jelly/ui";
import { useEditorStore } from "../../store";
import { saveTab } from "../../save";
import { useTabDrag } from "./drag";
import { LayoutView } from "./LayoutView";
import { UnsavedDialog } from "./UnsavedDialog";

export function EditorPane({ ctx }: { ctx: ExtensionContext }) {
  const root = useEditorStore((s) => s.root);
  const panes = useEditorStore((s) => s.panes);
  const closing = useEditorStore((s) => s.closing);
  const closeTab = useEditorStore((s) => s.closeTab);
  const cancelClose = useEditorStore((s) => s.cancelClose);
  const theme = useSetting(ctx, "ui.theme", "dark") as "dark" | "light";
  const drag = useTabDrag();

  const closingTab = closing ? panes[closing.paneId]?.tabs.find((t) => t.path === closing.path) : undefined;

  return (
    <div className="flex flex-1 overflow-hidden bg-bg">
      <LayoutView node={root} panes={panes} ctx={ctx} theme={theme} beginDrag={drag.begin} />
      {drag.overlay}

      {closing && closingTab && (
        <UnsavedDialog
          name={closingTab.name}
          onSave={async () => {
            const { paneId, path } = closing;
            cancelClose();
            await saveTab(path);
            closeTab(paneId, path);
          }}
          onDiscard={() => {
            closeTab(closing.paneId, closing.path);
            cancelClose();
          }}
          onCancel={cancelClose}
        />
      )}
    </div>
  );
}
