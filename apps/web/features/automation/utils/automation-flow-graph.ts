import type { Edge, Node } from "@xyflow/react";
import {
  AUTOMATION_ACTION_TYPE_DESCRIPTIONS,
  AUTOMATION_TRIGGER_EVENT_CATALOG,
} from "@repo/shared";
import type { AutomationDefinitionFormValues } from "../validation";

export const AUTOMATION_FLOW_TRIGGERS_NODE_ID = "automation-flow-triggers";

type TriggersStepsSlice = Pick<
  AutomationDefinitionFormValues,
  "triggers" | "steps"
>;

const STEP_X_GAP = 280;
const STEP_BASE_X = 40;
const NODE_Y = 40;

function triggerSummary(values: TriggersStepsSlice): string {
  if (values.triggers.length === 0) return "No triggers";
  return values.triggers
    .map((t) => {
      const meta = AUTOMATION_TRIGGER_EVENT_CATALOG[t.eventName];
      return meta?.label ?? t.eventName;
    })
    .join(" · ");
}

function stepLabel(actionType: string): string {
  return (
    AUTOMATION_ACTION_TYPE_DESCRIPTIONS[
      actionType as keyof typeof AUTOMATION_ACTION_TYPE_DESCRIPTIONS
    ]?.label ?? actionType
  );
}

/**
 * Maps automation form values to a linear React Flow graph (triggers → steps).
 */
export function automationFormValuesToFlowGraph(values: TriggersStepsSlice): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  nodes.push({
    id: AUTOMATION_FLOW_TRIGGERS_NODE_ID,
    type: "automationTriggers",
    position: { x: 0, y: NODE_Y },
    data: {
      summary: triggerSummary(values),
      count: values.triggers.length,
    },
  });

  values.steps.forEach((step, i) => {
    const id = `automation-step-${i}`;
    nodes.push({
      id,
      type: "automationStep",
      position: { x: STEP_BASE_X + (i + 1) * STEP_X_GAP, y: NODE_Y },
      data: {
        stepIndex: i,
        actionType: step.actionType,
        title: stepLabel(step.actionType),
      },
    });
    const source =
      i === 0 ? AUTOMATION_FLOW_TRIGGERS_NODE_ID : `automation-step-${i - 1}`;
    edges.push({
      id: `e-${source}-${id}`,
      source,
      target: id,
    });
  });

  return { nodes, edges };
}

/**
 * Reorders `steps` by left-to-right node order from the flow editor.
 */
export function reorderStepsByFlowOrder(
  steps: AutomationDefinitionFormValues["steps"],
  nodePositions: Array<{ id: string; x: number }>,
): AutomationDefinitionFormValues["steps"] {
  if (steps.length <= 1) return steps;

  const stepEntries = nodePositions
    .filter((n) => n.id.startsWith("automation-step-"))
    .map((n) => {
      const match = /^automation-step-(\d+)$/.exec(n.id);
      const originalIndex = match ? Number.parseInt(match[1]!, 10) : -1;
      return { originalIndex, x: n.x };
    })
    .filter((e) => e.originalIndex >= 0 && e.originalIndex < steps.length);

  if (stepEntries.length !== steps.length) return steps;

  const order = [...stepEntries]
    .sort((a, b) => a.x - b.x)
    .map((e) => e.originalIndex);

  return order.map((i) => steps[i]!);
}
