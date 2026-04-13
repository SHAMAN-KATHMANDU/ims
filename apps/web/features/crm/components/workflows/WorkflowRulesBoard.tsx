"use client";

import { useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { WorkflowRule } from "../../services/workflow.service";
import { workflowRulesToFlowGraph } from "./workflow-rules-flow";

function TriggerShape(props: NodeProps): React.ReactElement {
  const data = props.data as { label: string; sub: string };
  return (
    <div className="min-w-[200px] rounded-md border-2 border-primary/60 bg-card px-3 py-2 text-left shadow-sm">
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <p className="text-[10px] font-medium uppercase text-muted-foreground">
        Trigger
      </p>
      <p className="text-sm font-semibold leading-snug">{data.label}</p>
      <p className="text-xs text-muted-foreground">{data.sub}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function ActionShape(props: NodeProps): React.ReactElement {
  const data = props.data as { label: string };
  return (
    <div className="min-w-[200px] rounded-md border bg-muted/30 px-3 py-2 text-left shadow-sm">
      <Handle type="target" position={Position.Left} />
      <p className="text-[10px] font-medium uppercase text-muted-foreground">
        Action
      </p>
      <p className="text-sm font-semibold leading-snug">{data.label}</p>
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}

const nodeTypes = {
  workflowTrigger: TriggerShape,
  workflowAction: ActionShape,
};

export function WorkflowRulesBoard({
  rules,
}: {
  rules: WorkflowRule[];
}): React.ReactElement {
  const { nodes, edges } = useMemo(
    () => workflowRulesToFlowGraph(rules),
    [rules],
  );

  const height = Math.min(420, 120 + rules.length * 112);
  const flowKey = rules.map((r) => r.id).join(",");

  return (
    <ReactFlowProvider>
      <div
        className="w-full overflow-hidden rounded-lg border bg-muted/10"
        style={{ height }}
      >
        <ReactFlow
          key={flowKey}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <MiniMap zoomable={false} pannable={false} />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}
