import { describe, expect, it } from "vitest";
import { compileLinearStepsToFlowGraph } from "@repo/shared";
import {
  describeBranchDecisionLines,
  describeSkippedBranchArmsLines,
  extractGraphBranchDecisions,
  flowGraphNodeLabel,
  tryFlowGraphPayloadToReactFlow,
} from "./automation-flow-graph-view";

describe("extractGraphBranchDecisions", () => {
  it("returns null when stepOutput is missing or empty", () => {
    expect(extractGraphBranchDecisions(undefined)).toBeNull();
    expect(extractGraphBranchDecisions(null)).toBeNull();
    expect(extractGraphBranchDecisions({})).toBeNull();
  });

  it("parses branchDecisions map with string values", () => {
    const nodeId = "22222222-2222-2222-2222-222222222222";
    const out = extractGraphBranchDecisions({
      __automationGraph: { branchDecisions: { [nodeId]: "true" } },
    });
    expect(out).toEqual({ [nodeId]: "true" });
  });

  it("ignores non-string values", () => {
    const out = extractGraphBranchDecisions({
      __automationGraph: {
        branchDecisions: { a: "true", b: 1, c: "" },
      },
    });
    expect(out).toEqual({ a: "true" });
  });
});

describe("describeBranchDecisionLines", () => {
  const entryId = "11111111-1111-1111-1111-111111111111";
  const ifId = "22222222-2222-2222-2222-222222222222";
  const switchId = "33333333-3333-3333-3333-333333333333";

  const sampleGraph = {
    nodes: [
      { id: entryId, kind: "entry" as const },
      {
        id: ifId,
        kind: "if" as const,
        config: {
          conditions: [{ path: "x", operator: "eq" as const, value: 1 }],
        },
      },
      {
        id: switchId,
        kind: "switch" as const,
        config: { discriminantPath: "payload.kind" },
      },
    ],
    edges: [
      { fromNodeId: entryId, toNodeId: ifId },
      { fromNodeId: ifId, toNodeId: switchId },
    ],
  };

  it("labels if arms for true/false", () => {
    expect(
      describeBranchDecisionLines(sampleGraph, { [ifId]: "true" }),
    ).toEqual(["If → Then (conditions met)"]);
    expect(
      describeBranchDecisionLines(sampleGraph, { [ifId]: "false" }),
    ).toEqual(["If → Else (conditions not met)"]);
  });

  it("labels switch default and case", () => {
    const lines = describeBranchDecisionLines(sampleGraph, {
      [switchId]: "default",
    });
    expect(lines).toEqual(["Switch (payload.kind) → Default branch"]);

    const lines2 = describeBranchDecisionLines(sampleGraph, {
      [switchId]: "gold",
    });
    expect(lines2).toEqual(['Switch (payload.kind) → Case "gold"']);
  });

  it("falls back to short id when graph is unknown", () => {
    const id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const lines = describeBranchDecisionLines(null, { [id]: "true" });
    expect(lines).toEqual([`Node aaaaaaaa… → Route: true`]);
  });
});

describe("describeSkippedBranchArmsLines", () => {
  const entryId = "11111111-1111-1111-1111-111111111111";
  const ifId = "22222222-2222-2222-2222-222222222222";
  const nThen = "44444444-4444-4444-4444-444444444444";
  const nElse = "55555555-5555-5555-5555-555555555555";
  const switchId = "33333333-3333-3333-3333-333333333333";
  const nEast = "66666666-6666-6666-6666-666666666666";
  const nWest = "77777777-7777-7777-7777-777777777777";
  const nDef = "88888888-8888-8888-8888-888888888888";

  const ifSwitchGraph = {
    nodes: [
      { id: entryId, kind: "entry" as const },
      {
        id: ifId,
        kind: "if" as const,
        config: {
          conditions: [{ path: "x", operator: "eq" as const, value: 1 }],
        },
      },
      {
        id: switchId,
        kind: "switch" as const,
        config: { discriminantPath: "region" },
      },
      { id: nThen, kind: "noop" as const },
      { id: nElse, kind: "noop" as const },
      { id: nEast, kind: "noop" as const },
      { id: nWest, kind: "noop" as const },
      { id: nDef, kind: "noop" as const },
    ],
    edges: [
      { fromNodeId: entryId, toNodeId: ifId },
      { fromNodeId: ifId, toNodeId: nThen, edgeKey: "true" },
      { fromNodeId: ifId, toNodeId: nElse, edgeKey: "false" },
      { fromNodeId: nThen, toNodeId: switchId },
      { fromNodeId: switchId, toNodeId: nEast, edgeKey: "east" },
      { fromNodeId: switchId, toNodeId: nWest, edgeKey: "west" },
      { fromNodeId: switchId, toNodeId: nDef, edgeKey: "default" },
    ],
  };

  it("lists arms not taken for if and switch", () => {
    expect(
      describeSkippedBranchArmsLines(ifSwitchGraph, { [ifId]: "true" }),
    ).toEqual(["If → not taken: Else (conditions not met)"]);

    const skippedSwitch = describeSkippedBranchArmsLines(ifSwitchGraph, {
      [ifId]: "true",
      [switchId]: "east",
    });
    expect(skippedSwitch).toEqual([
      "If → not taken: Else (conditions not met)",
      'Switch (region) → not taken: Case "west"',
      "Switch (region) → not taken: Default branch",
    ]);
  });

  it("returns empty when graph is missing or edges lack keys", () => {
    expect(describeSkippedBranchArmsLines(null, { [ifId]: "true" })).toEqual(
      [],
    );
    expect(
      describeSkippedBranchArmsLines(
        {
          nodes: [
            {
              id: ifId,
              kind: "if" as const,
              config: {
                conditions: [{ path: "x", operator: "eq" as const, value: 1 }],
              },
            },
          ],
          edges: [],
        },
        { [ifId]: "true" },
      ),
    ).toEqual([]);
  });
});

describe("flowGraphNodeLabel", () => {
  it("returns labels for each node kind", () => {
    expect(flowGraphNodeLabel({ id: "1", kind: "entry" })).toBe("Start");
    expect(flowGraphNodeLabel({ id: "1", kind: "noop" })).toBe("Pass-through");
    expect(
      flowGraphNodeLabel({
        id: "1",
        kind: "action",
        config: {
          actionType: "notification.send",
          actionConfig: { title: "T", message: "M" },
        },
      }),
    ).toBe("Send notification");
  });
});

describe("tryFlowGraphPayloadToReactFlow", () => {
  it("maps a compiled linear graph to nodes and edges", () => {
    const payload = compileLinearStepsToFlowGraph(
      [
        {
          actionType: "notification.send",
          actionConfig: { title: "A", message: "B" },
        },
      ],
      undefined,
    );
    const result = tryFlowGraphPayloadToReactFlow(payload);
    expect(result).not.toBeNull();
    expect(result!.nodes.length).toBeGreaterThanOrEqual(2);
    expect(result!.edges.length).toBeGreaterThanOrEqual(1);
    expect(result!.nodes.some((n) => n.type === "automationPreviewEntry")).toBe(
      true,
    );
    expect(
      result!.nodes.some((n) => n.type === "automationPreviewAction"),
    ).toBe(true);
  });

  it("returns null for invalid payload", () => {
    expect(tryFlowGraphPayloadToReactFlow({ nodes: [], edges: [] })).toBeNull();
    expect(tryFlowGraphPayloadToReactFlow(null)).toBeNull();
  });
});
