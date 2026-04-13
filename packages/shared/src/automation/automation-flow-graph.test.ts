import { describe, expect, it } from "vitest";
import {
  compileComposableFlowSegments,
  compileIfElseFlowGraph,
  compileLinearStepsToFlowGraph,
  compileSwitchFlowGraph,
  composableSegmentsFitBr11Limits,
  parseAndValidateAutomationFlowGraph,
  tryDecompileLinearChainFlowGraph,
  tryDecompileLinearChainFlowGraphWithIds,
  tryExtractComposableFlowSegments,
  tryExtractIfElseAuthoringFromGraph,
  tryExtractSwitchAuthoringFromGraph,
  validateAutomationFlowGraphStructure,
} from "./automation-flow-graph";

function minimalLinearGraph() {
  const entry = "00000000-0000-4000-8000-000000000001";
  const noop = "00000000-0000-4000-8000-000000000002";
  const action = "00000000-0000-4000-8000-000000000003";
  return {
    nodes: [
      { id: entry, kind: "entry" as const },
      {
        id: action,
        kind: "action" as const,
        config: {
          actionType: "notification.send" as const,
          actionConfig: { type: "INFO", title: "t", message: "m" },
        },
      },
      { id: noop, kind: "noop" as const },
    ],
    edges: [
      { fromNodeId: entry, toNodeId: action },
      { fromNodeId: action, toNodeId: noop },
    ],
  };
}

describe("automation-flow-graph", () => {
  it("accepts minimal entry → action → noop", () => {
    const g = minimalLinearGraph();
    const r = parseAndValidateAutomationFlowGraph(g, [
      "inventory.stock.adjusted",
    ]);
    expect(r.ok).toBe(true);
  });

  it("rejects cycle", () => {
    const a = "00000000-0000-4000-8000-000000000010";
    const b = "00000000-0000-4000-8000-000000000011";
    const c = "00000000-0000-4000-8000-000000000012";
    const graph = {
      nodes: [
        { id: a, kind: "entry" as const },
        { id: b, kind: "noop" as const },
        { id: c, kind: "noop" as const },
      ],
      edges: [
        { fromNodeId: a, toNodeId: b },
        { fromNodeId: b, toNodeId: c },
        { fromNodeId: c, toNodeId: b },
      ],
    };
    const r = validateAutomationFlowGraphStructure(graph as never);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => /cycle/i.test(e))).toBe(true);
  });

  it("rejects if without true/false keys", () => {
    const entry = "00000000-0000-4000-8000-000000000020";
    const ifn = "00000000-0000-4000-8000-000000000021";
    const a1 = "00000000-0000-4000-8000-000000000022";
    const a2 = "00000000-0000-4000-8000-000000000023";
    const end = "00000000-0000-4000-8000-000000000024";
    const graph = {
      nodes: [
        { id: entry, kind: "entry" as const },
        {
          id: ifn,
          kind: "if" as const,
          config: {
            conditions: [{ path: "x", operator: "eq" as const, value: 1 }],
          },
        },
        {
          id: a1,
          kind: "action" as const,
          config: {
            actionType: "notification.send" as const,
            actionConfig: { type: "INFO", title: "t", message: "m" },
          },
        },
        {
          id: a2,
          kind: "action" as const,
          config: {
            actionType: "notification.send" as const,
            actionConfig: { type: "INFO", title: "t", message: "m" },
          },
        },
        { id: end, kind: "noop" as const },
      ],
      edges: [
        { fromNodeId: entry, toNodeId: ifn },
        { fromNodeId: ifn, toNodeId: a1, edgeKey: "yes" },
        { fromNodeId: ifn, toNodeId: a2, edgeKey: "no" },
        { fromNodeId: a1, toNodeId: end },
        { fromNodeId: a2, toNodeId: end },
      ],
    };
    const r = validateAutomationFlowGraphStructure(graph as never);
    expect(r.ok).toBe(false);
  });

  it("compileLinearStepsToFlowGraph validates and round-trips via tryDecompileLinearChainFlowGraph", () => {
    const steps = [
      {
        actionType: "notification.send" as const,
        actionConfig: { type: "INFO" as const, title: "a", message: "m" },
        continueOnError: true,
      },
      {
        actionType: "notification.send" as const,
        actionConfig: { type: "WARN" as const, title: "b", message: "n" },
      },
    ];
    const graph = compileLinearStepsToFlowGraph(steps);
    const v = parseAndValidateAutomationFlowGraph(graph, [
      "inventory.stock.adjusted",
    ]);
    expect(v.ok).toBe(true);
    const back = tryDecompileLinearChainFlowGraph(graph);
    expect(back).toEqual(steps);
  });

  it("compileLinearStepsToFlowGraph reuses ids when options match step count", () => {
    const entry = "00000000-0000-4000-8000-0000000000a1";
    const a1 = "00000000-0000-4000-8000-0000000000a2";
    const a2 = "00000000-0000-4000-8000-0000000000a3";
    const steps = [
      {
        actionType: "notification.send" as const,
        actionConfig: { type: "INFO" as const, title: "a", message: "m" },
      },
      {
        actionType: "notification.send" as const,
        actionConfig: { type: "WARN" as const, title: "b", message: "n" },
      },
    ];
    const graph = compileLinearStepsToFlowGraph(steps, {
      entryId: entry,
      actionNodeIds: [a1, a2],
    });
    expect(graph.nodes.find((n) => n.kind === "entry")?.id).toBe(entry);
    const actions = graph.nodes.filter((n) => n.kind === "action");
    expect(actions.map((n) => n.id)).toEqual([a1, a2]);
  });

  it("tryDecompileLinearChainFlowGraphWithIds returns entry and action ids", () => {
    const g = minimalLinearGraph();
    const chain = tryDecompileLinearChainFlowGraphWithIds(g);
    expect(chain).not.toBeNull();
    if (!chain) return;
    expect(chain.entryNodeId).toBe(g.nodes[0]!.id);
    expect(chain.actionNodeIds).toEqual([g.nodes[1]!.id]);
    expect(chain.steps).toHaveLength(1);
  });

  /**
   * Builder save and web canvas “stored graph” preview both call
   * `compileLinearStepsToFlowGraph(steps, stableIds)` when step count matches
   * `tryDecompileLinearChainFlowGraphWithIds`. This must reproduce the same graph
   * so ids do not churn on save and preview matches payload.
   */
  it("decompile linear chain then recompile with returned ids is deep-equal to original graph", () => {
    const steps = [
      {
        actionType: "notification.send" as const,
        actionConfig: { type: "INFO" as const, title: "a", message: "m" },
        continueOnError: true,
      },
      {
        actionType: "notification.send" as const,
        actionConfig: { type: "WARN" as const, title: "b", message: "n" },
      },
    ];
    const graph = compileLinearStepsToFlowGraph(steps);
    const meta = tryDecompileLinearChainFlowGraphWithIds(graph);
    expect(meta).not.toBeNull();
    if (!meta) return;

    const sameAsCanvasMapper = meta.steps.map((s) => ({
      actionType: s.actionType,
      actionConfig: s.actionConfig,
      ...(s.continueOnError ? { continueOnError: true as const } : {}),
    }));

    const rebuiltFromMetaSteps = compileLinearStepsToFlowGraph(meta.steps, {
      entryId: meta.entryNodeId,
      actionNodeIds: meta.actionNodeIds,
    });
    const rebuiltFromCanvasMapped = compileLinearStepsToFlowGraph(
      sameAsCanvasMapper,
      {
        entryId: meta.entryNodeId,
        actionNodeIds: meta.actionNodeIds,
      },
    );

    expect(rebuiltFromMetaSteps).toEqual(graph);
    expect(rebuiltFromCanvasMapped).toEqual(graph);
  });

  it("tryDecompileLinearChainFlowGraph returns null for graphs with if nodes", () => {
    const entry = "00000000-0000-4000-8000-000000000030";
    const ifn = "00000000-0000-4000-8000-000000000031";
    const a1 = "00000000-0000-4000-8000-000000000032";
    const a2 = "00000000-0000-4000-8000-000000000033";
    const end = "00000000-0000-4000-8000-000000000034";
    const graph = {
      nodes: [
        { id: entry, kind: "entry" as const },
        {
          id: ifn,
          kind: "if" as const,
          config: {
            conditions: [{ path: "x", operator: "eq" as const, value: 1 }],
          },
        },
        {
          id: a1,
          kind: "action" as const,
          config: {
            actionType: "notification.send" as const,
            actionConfig: { type: "INFO", title: "t", message: "m" },
          },
        },
        {
          id: a2,
          kind: "action" as const,
          config: {
            actionType: "notification.send" as const,
            actionConfig: { type: "INFO", title: "t", message: "m" },
          },
        },
        { id: end, kind: "noop" as const },
      ],
      edges: [
        { fromNodeId: entry, toNodeId: ifn },
        { fromNodeId: ifn, toNodeId: a1, edgeKey: "true" },
        { fromNodeId: ifn, toNodeId: a2, edgeKey: "false" },
        { fromNodeId: a1, toNodeId: end },
        { fromNodeId: a2, toNodeId: end },
      ],
    };
    expect(tryDecompileLinearChainFlowGraph(graph)).toBeNull();
  });

  it("compileIfElseFlowGraph round-trips via tryExtractIfElseAuthoringFromGraph", () => {
    const graph = compileIfElseFlowGraph({
      conditions: [{ path: "priority", operator: "eq", value: "high" }],
      trueStep: {
        actionType: "notification.send",
        actionConfig: { type: "INFO", title: "T", message: "y" },
      },
      falseStep: {
        actionType: "notification.send",
        actionConfig: { type: "WARN", title: "F", message: "n" },
      },
    });
    const ex = tryExtractIfElseAuthoringFromGraph(graph);
    expect(ex).not.toBeNull();
    if (!ex) return;
    const rebuilt = compileIfElseFlowGraph(
      {
        conditions: ex.conditions,
        trueStep: ex.trueStep,
        falseStep: ex.falseStep,
      },
      ex.ids,
    );
    expect(rebuilt).toEqual(graph);
  });

  it("compileSwitchFlowGraph round-trips via tryExtractSwitchAuthoringFromGraph", () => {
    const graph = compileSwitchFlowGraph({
      discriminantPath: "region",
      cases: [
        {
          edgeKey: "east",
          step: {
            actionType: "notification.send",
            actionConfig: { type: "INFO", title: "E", message: "e" },
          },
        },
        {
          edgeKey: "west",
          step: {
            actionType: "notification.send",
            actionConfig: { type: "INFO", title: "W", message: "w" },
          },
        },
      ],
      defaultStep: {
        actionType: "notification.send",
        actionConfig: { type: "INFO", title: "D", message: "d" },
      },
    });
    const ex = tryExtractSwitchAuthoringFromGraph(graph);
    expect(ex).not.toBeNull();
    if (!ex) return;
    const rebuilt = compileSwitchFlowGraph(
      {
        discriminantPath: ex.discriminantPath,
        cases: ex.cases,
        defaultStep: ex.defaultStep,
      },
      ex.ids,
    );
    expect(rebuilt).toEqual(graph);
  });

  it("compileComposableFlowSegments + tryExtractComposableFlowSegments round-trip single if_else", () => {
    const segments = [
      {
        kind: "if_else" as const,
        conditions: [{ path: "total", operator: "gte" as const, value: 10 }],
        trueStep: {
          actionType: "notification.send" as const,
          actionConfig: { type: "INFO" as const, title: "T", message: "t" },
        },
        falseStep: {
          actionType: "notification.send" as const,
          actionConfig: { type: "WARN" as const, title: "F", message: "f" },
        },
      },
    ];
    const graph = compileComposableFlowSegments(segments);
    const v = parseAndValidateAutomationFlowGraph(graph, [
      "inventory.stock.adjusted",
    ]);
    expect(v.ok).toBe(true);
    const back = tryExtractComposableFlowSegments(graph);
    expect(back).not.toBeNull();
    if (!back) return;
    const entryId = graph.nodes.find((n) => n.kind === "entry")?.id;
    const rebuilt = compileComposableFlowSegments(back, { entryId });
    expect(rebuilt).toEqual(graph);
  });

  it("compileComposableFlowSegments chains action then if_else (parseAndValidate)", () => {
    const segments = [
      {
        kind: "action" as const,
        step: {
          actionType: "notification.send" as const,
          actionConfig: { type: "INFO" as const, title: "A", message: "a" },
        },
      },
      {
        kind: "if_else" as const,
        conditions: [{ path: "x", operator: "eq" as const, value: 1 }],
        trueStep: {
          actionType: "notification.send" as const,
          actionConfig: { type: "INFO" as const, title: "T", message: "t" },
        },
        falseStep: {
          actionType: "notification.send" as const,
          actionConfig: { type: "INFO" as const, title: "F", message: "f" },
        },
      },
    ];
    const graph = compileComposableFlowSegments(segments);
    const v = parseAndValidateAutomationFlowGraph(graph, [
      "inventory.stock.adjusted",
    ]);
    expect(v.ok).toBe(true);
    const back = tryExtractComposableFlowSegments(graph);
    expect(back).not.toBeNull();
    const entryId = graph.nodes.find((n) => n.kind === "entry")?.id;
    const rebuilt = compileComposableFlowSegments(back!, { entryId });
    expect(rebuilt).toEqual(graph);
  });

  it("composableSegmentsFitBr11Limits rejects oversized segment list", () => {
    const manyActions = Array.from({ length: 70 }, () => ({
      kind: "action" as const,
      step: {
        actionType: "notification.send" as const,
        actionConfig: { type: "INFO" as const, title: "x", message: "m" },
      },
    }));
    expect(composableSegmentsFitBr11Limits(manyActions)).toBe(false);
  });
});
