import { Store } from "../core/store";

export interface WorkbenchState {
  /** false → the welcome surface fills the window; true → the editor workbench */
  workspaceOpen: boolean;
  /** id of the sidebar panel currently shown (null = sidebar collapsed) */
  activePanelId: string | null;
  sidebarWidth: number;
}

/**
 * The kernel's layout state: which surface is shown, which sidebar panel is
 * active, and the sidebar width. The Shell reads it reactively; extensions
 * never touch it directly — workspace open/close is driven by bus events.
 */
export class Workbench extends Store {
  private state: WorkbenchState = {
    workspaceOpen: false,
    activePanelId: "files",
    sidebarWidth: 240,
  };

  // Tracks the last non-null panel so toggle-without-id can reopen it.
  private lastOpenPanelId: string = "files";

  getState = (): WorkbenchState => this.state;

  private set(patch: Partial<WorkbenchState>): void {
    this.state = { ...this.state, ...patch };
    this.notify();
  }

  setWorkspaceOpen(workspaceOpen: boolean): void {
    if (this.state.workspaceOpen !== workspaceOpen) this.set({ workspaceOpen });
  }

  setActivePanel(activePanelId: string | null): void {
    if (this.state.activePanelId !== activePanelId) this.set({ activePanelId });
  }

  /** Toggle a panel. With an id: toggle that specific panel open/closed.
   *  Without an id: collapse if any panel is open, else reopen the last one. */
  togglePanel(id?: string): void {
    if (id === undefined) {
      const next = this.state.activePanelId ? null : this.lastOpenPanelId;
      this.set({ activePanelId: next });
    } else {
      const next = this.state.activePanelId === id ? null : id;
      if (next) this.lastOpenPanelId = next;
      this.set({ activePanelId: next });
    }
  }

  setSidebarWidth(sidebarWidth: number): void {
    if (this.state.sidebarWidth !== sidebarWidth) this.set({ sidebarWidth });
  }
}
