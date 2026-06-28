import { Fragment, useRef } from "react";
import { type LayoutNode, type Pane, useEditorStore } from "../../store";
import { PaneView, type PaneProps } from "./PaneView";
import { Resizer } from "./Resizer";

const nodeKey = (n: LayoutNode) => (n.type === "leaf" ? n.paneId : n.id);

function hasVisibleLeaf(node: LayoutNode, hiddenPaneIds: Set<string>): boolean {
  if (node.type === "leaf") return !hiddenPaneIds.has(node.paneId);
  return node.children.some((child) => hasVisibleLeaf(child, hiddenPaneIds));
}

/** Recursively renders the split tree: leaves as panes, splits as resizable rows/columns. */
export function LayoutView({ node, panes, ...rest }: PaneProps & { node: LayoutNode; panes: Record<string, Pane> }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hiddenPaneIds = useEditorStore((s) => s.hiddenPaneIds);
  if (node.type === "leaf") {
    if (hiddenPaneIds.has(node.paneId)) return null;
    const pane = panes[node.paneId];
    return pane ? <PaneView pane={pane} {...rest} /> : null;
  }
  const visible = node.children
    .map((child, index) => ({ child, index }))
    .filter(({ child }) => hasVisibleLeaf(child, hiddenPaneIds));
  if (visible.length === 0) return null;
  if (visible.length === 1) return <LayoutView node={visible[0].child} panes={panes} {...rest} />;
  const canResize = visible.length === node.children.length;
  return (
    <div ref={containerRef} className={`flex flex-1 min-w-0 min-h-0 ${node.dir === "column" ? "flex-col" : "flex-row"}`}>
      {visible.map(({ child, index }, i) => (
        <Fragment key={nodeKey(child)}>
          <div className="flex min-w-0 min-h-0" style={{ flexGrow: node.sizes[index], flexBasis: 0 }}>
            <LayoutView node={child} panes={panes} {...rest} />
          </div>
          {canResize && i < visible.length - 1 && (
            <Resizer splitId={node.id} index={i} dir={node.dir} sizes={node.sizes} containerRef={containerRef} />
          )}
        </Fragment>
      ))}
    </div>
  );
}
