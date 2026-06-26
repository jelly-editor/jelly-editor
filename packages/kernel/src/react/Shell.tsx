import { ActivityBar, Sidebar, StatusBar, TitleBar } from "./chrome";
import { useWorkbenchState } from "./hooks";
import { Slot } from "./Slot";

/**
 * The thin host layout. It owns no features — it lays out the kernel's slots
 * and lets extensions fill them. Before a workspace is open it renders the
 * welcome surface full-screen; once open, the editor workbench. The modal and
 * context-menu slots overlay both.
 */
export function Shell() {
  const { workspaceOpen } = useWorkbenchState();

  return (
    <div className="flex flex-col h-full bg-bg text-text">
      {workspaceOpen ? <Workbench /> : <Slot slot="welcome" />}
      <Slot slot="modal" />
      <Slot slot="context-menu" />
    </div>
  );
}

function Workbench() {
  return (
    <div className="flex flex-col h-full pt-[38px] overflow-hidden animate-[fadeIn_100ms_ease]">
      <TitleBar />
      <div className="flex flex-row flex-1 overflow-hidden">
        <ActivityBar />
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Slot slot="editor.surface" />
          <Slot slot="panel.tab" />
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
