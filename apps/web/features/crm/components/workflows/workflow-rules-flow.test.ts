import { describe, expect, it } from "vitest";
import { workflowRulesToFlowGraph } from "./workflow-rules-flow";
import type { WorkflowRule } from "../../services/workflow.service";

const sampleRules: WorkflowRule[] = [
  {
    id: "r1",
    trigger: "STAGE_ENTER",
    triggerStageId: null,
    action: "CREATE_TASK",
    actionConfig: {},
    ruleOrder: 0,
  },
  {
    id: "r2",
    trigger: "DEAL_WON",
    triggerStageId: null,
    action: "SEND_NOTIFICATION",
    actionConfig: {},
    ruleOrder: 1,
  },
];

describe("workflowRulesToFlowGraph", () => {
  it("creates two rows of trigger-action pairs", () => {
    const { nodes, edges } = workflowRulesToFlowGraph(sampleRules);
    expect(nodes).toHaveLength(4);
    expect(edges).toHaveLength(2);
    expect(edges[0]?.source).toMatch(/wf-rule-0-trigger/);
    expect(edges[0]?.target).toMatch(/wf-rule-0-action/);
  });
});
