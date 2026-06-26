import type { ReactNode } from "react";

export interface ActivityBarItem {
  id: string;
  /** renders the button's icon (a small SVG node, typically) */
  icon: () => ReactNode;
  title?: string;
  /** which end of the rail; defaults to "top" */
  align?: "top" | "bottom";
  order?: number;
  /**
   * Click behavior. If omitted, clicking toggles the sidebar panel whose id
   * matches this item's id (the kernel manages active-panel state). Provide
   * onSelect for items that run an action instead (theme toggle, settings).
   */
  onSelect?: () => void;
}

export interface SidebarPanel {
  id: string;
  render: () => ReactNode;
}

export interface StatusBarItem {
  id: string;
  align: "left" | "right";
  render: () => ReactNode;
  order?: number;
}

export interface EditorSurface {
  id: string;
  /** which resources this surface can open */
  canOpen: (uri: string) => boolean;
  render: (props: { uri: string }) => ReactNode;
}

export interface PanelTab {
  id: string;
  title: string;
  render: () => ReactNode;
}
