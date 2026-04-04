import type { Edge, Node } from "@xyflow/react";
import { getWorkflowActionLabel, getWorkflowTriggerLabel } from "@repo/shared";
import type { WorkflowRule } from "../../services/workflow.service";

const ROW_Y = 100;
const ROW_GAP = 110;
const TRIGGER_X = 0;
const ACTION_X = 300;

/**
 * One row per rule: trigger node → action node (read-only diagram).
 */
export function workflowRulesToFlowGraph(rules: WorkflowRule[]): {
  nodes: Node[];
  edges: Edge[];
} {
  const sorted = [...rules].sort(
    (a, b) => (a.ruleOrder ?? 0) - (b.ruleOrder ?? 0),
  );

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  sorted.forEach((rule, i) => {
    const y = ROW_Y + i * ROW_GAP;
    const tid = `wf-rule-${i}-trigger`;
    const aid = `wf-rule-${i}-action`;
    nodes.push({
      id: tid,
      type: "workflowTrigger",
      position: { x: TRIGGER_X, y },
      data: {
        label: getWorkflowTriggerLabel(rule.trigger),
        sub: rule.triggerStageId ? `Stage filter` : "Any stage (if applicable)",
      },
    });
    nodes.push({
      id: aid,
      type: "workflowAction",
      position: { x: ACTION_X, y },
      data: {
        label: getWorkflowActionLabel(rule.action),
      },
    });
    edges.push({
      id: `wf-e-${i}`,
      source: tid,
      target: aid,
    });
  });

  return { nodes, edges };
}
