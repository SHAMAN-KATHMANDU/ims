"use client";

import { useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  Panel,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { tryFlowGraphPayloadToReactFlow } from "../utils/automation-flow-graph-view";

function PreviewEntryNode(props: NodeProps): React.ReactElement {
  const label = (props.data as { label?: string }).label ?? "Start";
  return (
    <div className="min-w-[140px] rounded-lg border-2 border-primary bg-card px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-foreground">{label}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function PreviewNoopNode(props: NodeProps): React.ReactElement {
  const label = (props.data as { label?: string }).label ?? "Pass-through";
  return (
    <div className="min-w-[120px] rounded-md border border-dashed bg-muted/40 px-2 py-1.5 text-xs">
      <Handle type="target" position={Position.Left} />
      <p className="font-medium">{label}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function PreviewActionNode(props: NodeProps): React.ReactElement {
  const { label, actionType } = props.data as {
    label?: string;
    actionType?: string;
  };
  return (
    <div className="min-w-[160px] rounded-lg border bg-card px-3 py-2 shadow-sm">
      <Handle type="target" position={Position.Left} />
      <p className="text-xs font-semibold leading-snug">{label ?? "Action"}</p>
      {actionType ? (
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
          {actionType}
        </p>
      ) : null}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function PreviewIfNode(props: NodeProps): React.ReactElement {
  const label = (props.data as { label?: string }).label ?? "If";
  return (
    <div className="min-w-[140px] rounded-lg border-2 border-amber-500/60 bg-amber-50/80 px-3 py-2 text-xs shadow-sm dark:bg-amber-950/40">
      <Handle type="target" position={Position.Left} />
      <p className="font-semibold text-amber-900 dark:text-amber-100">
        {label}
      </p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">
        true / false arms (see edge labels)
      </p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function PreviewSwitchNode(props: NodeProps): React.ReactElement {
  const label = (props.data as { label?: string }).label ?? "Switch";
  return (
    <div className="min-w-[160px] rounded-lg border-2 border-violet-500/50 bg-violet-50/80 px-3 py-2 text-xs shadow-sm dark:bg-violet-950/40">
      <Handle type="target" position={Position.Left} />
      <p className="font-semibold text-violet-900 dark:text-violet-100">
        {label}
      </p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">
        Outgoing edges show case keys
      </p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const previewNodeTypes = {
  automationPreviewEntry: PreviewEntryNode,
  automationPreviewNoop: PreviewNoopNode,
  automationPreviewAction: PreviewActionNode,
  automationPreviewIf: PreviewIfNode,
  automationPreviewSwitch: PreviewSwitchNode,
};

interface AutomationFlowGraphPreviewProps {
  flowGraph: unknown;
  className?: string;
}

/**
 * Read-only DAG preview (entry, noop, action, if, switch) for API-authored graphs.
 */
export function AutomationFlowGraphPreview({
  flowGraph,
  className,
}: AutomationFlowGraphPreviewProps): React.ReactElement {
  const layout = useMemo(
    () => tryFlowGraphPayloadToReactFlow(flowGraph),
    [flowGraph],
  );

  if (!layout) {
    return (
      <p className="text-xs text-muted-foreground">
        Could not parse flow graph for preview.
      </p>
    );
  }

  const { nodes, edges } = layout;

  return (
    <div
      className={
        className ??
        "h-[min(320px,50vh)] min-h-[200px] w-full rounded-md border bg-muted/20"
      }
    >
      <ReactFlow
        nodes={nodes as Node[]}
        edges={edges as Edge[]}
        nodeTypes={previewNodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} />
        <Controls showInteractive={false} />
        <Panel
          position="top-left"
          className="m-2 max-w-[220px] rounded border bg-background/90 px-2 py-1 text-[10px] text-muted-foreground shadow-sm backdrop-blur"
        >
          Read-only preview. Edit branching graphs via the API or a future flow
          editor.
        </Panel>
      </ReactFlow>
    </div>
  );
}
