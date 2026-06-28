import { Fragment, useRef } from "react";
import type { LayoutNode, Pane } from "../../store";
import { PaneView, type PaneProps } from "./PaneView";
import { Resizer } from "./Resizer";

const nodeKey = (n: LayoutNode) => (n.type === "leaf" ? n.paneId : n.id);

/** Recursively renders the split tree: leaves as panes, splits as resizable rows/columns. */
export function LayoutView({ node, panes, ...rest }: PaneProps & { node: LayoutNode; panes: Record<string, Pane> }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  if (node.type === "leaf") {
    const pane = panes[node.paneId];
    return pane ? <PaneView pane={pane} {...rest} /> : null;
  }
  return (
    <div ref={containerRef} className={`flex flex-1 min-w-0 min-h-0 ${node.dir === "column" ? "flex-col" : "flex-row"}`}>
      {node.children.map((child, i) => (
        <Fragment key={nodeKey(child)}>
          <div className="flex min-w-0 min-h-0" style={{ flexGrow: node.sizes[i], flexBasis: 0 }}>
            <LayoutView node={child} panes={panes} {...rest} />
          </div>
          {i < node.children.length - 1 && (
            <Resizer splitId={node.id} index={i} dir={node.dir} sizes={node.sizes} containerRef={containerRef} />
          )}
        </Fragment>
      ))}
    </div>
  );
}
