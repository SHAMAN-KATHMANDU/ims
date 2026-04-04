import { describe, expect, it } from "vitest";
import {
  AUTOMATION_FLOW_TRIGGERS_NODE_ID,
  automationFormValuesToFlowGraph,
  reorderStepsByFlowOrder,
} from "./automation-flow-graph";
import type { AutomationDefinitionFormValues } from "../validation";

const sampleValues: AutomationDefinitionFormValues = {
  name: "Test",
  description: "",
  scopeType: "GLOBAL",
  scopeId: "",
  status: "ACTIVE",
  executionMode: "LIVE",
  suppressLegacyWorkflows: false,
  triggers: [
    {
      eventName: "crm.deal.created",
      conditions: [],
      delayMinutes: 0,
    },
  ],
  steps: [
    {
      actionType: "workitem.create",
      actionConfig: { title: "A", type: "TASK", priority: "MEDIUM" },
      continueOnError: false,
    },
    {
      actionType: "notification.send",
      actionConfig: { title: "N", message: "M" },
      continueOnError: false,
    },
  ],
};

describe("automationFormValuesToFlowGraph", () => {
  it("creates triggers node and step chain", () => {
    const { nodes, edges } = automationFormValuesToFlowGraph(sampleValues);
    expect(nodes.some((n) => n.id === AUTOMATION_FLOW_TRIGGERS_NODE_ID)).toBe(
      true,
    );
    expect(nodes.filter((n) => n.type === "automationStep")).toHaveLength(2);
    expect(edges).toHaveLength(2);
    expect(edges[0]?.source).toBe(AUTOMATION_FLOW_TRIGGERS_NODE_ID);
    expect(edges[0]?.target).toBe("automation-step-0");
    expect(edges[1]?.source).toBe("automation-step-0");
    expect(edges[1]?.target).toBe("automation-step-1");
  });
});

describe("reorderStepsByFlowOrder", () => {
  it("reorders by ascending x", () => {
    const positions = [
      { id: "automation-step-0", x: 600 },
      { id: "automation-step-1", x: 320 },
    ];
    const next = reorderStepsByFlowOrder(sampleValues.steps, positions);
    expect(next[0]?.actionType).toBe("notification.send");
    expect(next[1]?.actionType).toBe("workitem.create");
  });

  it("returns original when step count mismatch", () => {
    const positions = [{ id: "automation-step-0", x: 0 }];
    const next = reorderStepsByFlowOrder(sampleValues.steps, positions);
    expect(next).toEqual(sampleValues.steps);
  });
});
