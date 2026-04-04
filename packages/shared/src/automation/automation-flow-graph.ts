import { z } from "zod";
import {
  AutomationActionTypeSchema,
  AutomationConditionSchema,
  AutomationTriggerEventSchema,
  isAutomationActionAllowedForEvent,
  type AutomationCondition,
} from "./automation-schemas";

export const MAX_AUTOMATION_FLOW_GRAPH_NODES = 64;
export const MAX_AUTOMATION_FLOW_GRAPH_EDGES = 128;
export const MAX_CONDITIONS_PER_IF_NODE = 16;
export const MAX_SWITCH_OUT_EDGES = 32;

const FlowGraphEdgeSchema = z.object({
  fromNodeId: z.string().uuid(),
  toNodeId: z.string().uuid(),
  edgeKey: z.string().min(1).max(120).optional().nullable(),
});

const EntryGraphNodeSchema = z.object({
  id: z.string().uuid(),
  kind: z.literal("entry"),
});

const NoopGraphNodeSchema = z.object({
  id: z.string().uuid(),
  kind: z.literal("noop"),
});

const ActionGraphNodeSchema = z.object({
  id: z.string().uuid(),
  kind: z.literal("action"),
  config: z.object({
    actionType: AutomationActionTypeSchema,
    actionConfig: z.record(z.unknown()),
    continueOnError: z.boolean().optional(),
  }),
});

const IfGraphNodeSchema = z.object({
  id: z.string().uuid(),
  kind: z.literal("if"),
  config: z.object({
    conditions: z
      .array(AutomationConditionSchema)
      .min(1)
      .max(MAX_CONDITIONS_PER_IF_NODE),
  }),
});

const SwitchGraphNodeSchema = z.object({
  id: z.string().uuid(),
  kind: z.literal("switch"),
  config: z.object({
    discriminantPath: z.string().min(1).max(500),
  }),
});

const FlowGraphNodeSchema = z.discriminatedUnion("kind", [
  EntryGraphNodeSchema,
  NoopGraphNodeSchema,
  ActionGraphNodeSchema,
  IfGraphNodeSchema,
  SwitchGraphNodeSchema,
]);

export const AutomationFlowGraphPayloadSchema = z.object({
  nodes: z
    .array(FlowGraphNodeSchema)
    .min(1)
    .max(MAX_AUTOMATION_FLOW_GRAPH_NODES),
  edges: z.array(FlowGraphEdgeSchema).max(MAX_AUTOMATION_FLOW_GRAPH_EDGES),
});

export type AutomationFlowGraphPayload = z.infer<
  typeof AutomationFlowGraphPayloadSchema
>;
export type FlowGraphNode = AutomationFlowGraphPayload["nodes"][number];

export type ValidatedFlowGraph = {
  nodesById: Map<string, FlowGraphNode>;
  /** Outgoing edges in stable array order (first match wins for switch). */
  outgoing: Map<string, Array<{ toNodeId: string; edgeKey: string | null }>>;
  entryId: string;
};

function addOutgoingEdge(
  outgoing: ValidatedFlowGraph["outgoing"],
  from: string,
  to: string,
  key: string | null,
) {
  const list = outgoing.get(from) ?? [];
  list.push({ toNodeId: to, edgeKey: key });
  outgoing.set(from, list);
}

/**
 * Structural + DAG + branch-shape validation. Call after Zod parse.
 */
export function validateAutomationFlowGraphStructure(
  graph: AutomationFlowGraphPayload,
):
  | { ok: true; validated: ValidatedFlowGraph }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const nodesById = new Map<string, FlowGraphNode>();
  for (const n of graph.nodes) {
    if (nodesById.has(n.id)) {
      errors.push(`Duplicate node id: ${n.id}`);
    }
    nodesById.set(n.id, n);
  }

  const entries = graph.nodes.filter((n) => n.kind === "entry");
  if (entries.length !== 1) {
    errors.push(`Expected exactly one entry node, found ${entries.length}`);
  }

  const outgoing: ValidatedFlowGraph["outgoing"] = new Map();
  const inDegree = new Map<string, number>();
  for (const n of graph.nodes) {
    inDegree.set(n.id, 0);
  }

  for (const e of graph.edges) {
    if (!nodesById.has(e.fromNodeId)) {
      errors.push(`Edge from unknown node: ${e.fromNodeId}`);
    }
    if (!nodesById.has(e.toNodeId)) {
      errors.push(`Edge to unknown node: ${e.toNodeId}`);
    }
    addOutgoingEdge(outgoing, e.fromNodeId, e.toNodeId, e.edgeKey ?? null);
    inDegree.set(e.toNodeId, (inDegree.get(e.toNodeId) ?? 0) + 1);
  }

  const entryId = entries[0]?.id;
  if (!entryId) {
    return errors.length
      ? { ok: false, errors }
      : { ok: false, errors: ["Missing entry"] };
  }

  if ((inDegree.get(entryId) ?? 0) > 0) {
    errors.push("entry node must have no incoming edges");
  }

  const entryOut = outgoing.get(entryId) ?? [];
  if (entryOut.length === 0) {
    errors.push("entry must have at least one outgoing edge");
  }
  if (entryOut.length > 1) {
    errors.push("entry must have exactly one outgoing edge when non-terminal");
  }

  for (const node of graph.nodes) {
    const outs = outgoing.get(node.id) ?? [];
    const isTerminal = outs.length === 0;

    if (node.kind === "entry" || node.kind === "noop") {
      if (!isTerminal && outs.length !== 1) {
        errors.push(
          `${node.kind} node ${node.id} must have exactly one outgoing edge or be terminal`,
        );
      }
    }

    if (node.kind === "if") {
      if (outs.length !== 2) {
        errors.push(`if node ${node.id} must have exactly two outgoing edges`);
        continue;
      }
      const keys = new Set(outs.map((o) => o.edgeKey));
      if (!keys.has("true") || !keys.has("false")) {
        errors.push(
          `if node ${node.id} must have edgeKey "true" and "false" on its two edges`,
        );
      }
    }

    if (node.kind === "switch") {
      if (outs.length < 2) {
        errors.push(
          `switch node ${node.id} must have at least two outgoing edges`,
        );
      }
      if (outs.length > MAX_SWITCH_OUT_EDGES) {
        errors.push(`switch node ${node.id} exceeds max outgoing edges`);
      }
      const keys = outs.map((o) => o.edgeKey);
      const nonNull = keys.filter((k): k is string => k != null && k !== "");
      const defaultCount = nonNull.filter((k) => k === "default").length;
      if (defaultCount > 1) {
        errors.push(`switch node ${node.id} may have at most one default edge`);
      }
      const seen = new Set<string>();
      for (const k of nonNull) {
        if (k === "default") continue;
        if (seen.has(k)) {
          errors.push(`switch node ${node.id} has duplicate edge key: ${k}`);
        }
        seen.add(k);
      }
      const hasDefault = nonNull.includes("default");
      if (!hasDefault) {
        errors.push(
          `switch node ${node.id} must include a "default" edge (required for deterministic fallback)`,
        );
      }
    }
  }

  const actionNodes = graph.nodes.filter((n) => n.kind === "action");
  if (actionNodes.length === 0) {
    errors.push("Graph must contain at least one action node");
  }

  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfsCycle(id: string): boolean {
    if (stack.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    stack.add(id);
    for (const e of outgoing.get(id) ?? []) {
      if (dfsCycle(e.toNodeId)) return true;
    }
    stack.delete(id);
    return false;
  }

  if (dfsCycle(entryId)) {
    errors.push("Graph contains a cycle");
  }

  const reachable = new Set<string>();
  const q = [entryId];
  reachable.add(entryId);
  while (q.length) {
    const cur = q.pop()!;
    for (const e of outgoing.get(cur) ?? []) {
      if (!reachable.has(e.toNodeId)) {
        reachable.add(e.toNodeId);
        q.push(e.toNodeId);
      }
    }
  }

  for (const n of actionNodes) {
    if (!reachable.has(n.id)) {
      errors.push(`action node ${n.id} is not reachable from entry`);
    }
  }

  return errors.length > 0
    ? { ok: false, errors }
    : { ok: true, validated: { nodesById, outgoing, entryId } };
}

export function validateAutomationFlowGraphActions(
  graph: AutomationFlowGraphPayload,
  triggerEventNames: string[],
): string[] {
  const errors: string[] = [];
  const events = triggerEventNames.map(
    (e) => AutomationTriggerEventSchema.safeParse(e).data,
  );
  const validEvents = events.filter(
    (e): e is z.infer<typeof AutomationTriggerEventSchema> => e != null,
  );

  for (const n of graph.nodes) {
    if (n.kind !== "action") continue;
    const at = n.config.actionType;
    const ok = validEvents.some((ev) =>
      isAutomationActionAllowedForEvent(at, ev),
    );
    if (!ok) {
      errors.push(
        `Action "${at}" is not compatible with the selected trigger set`,
      );
    }
  }
  return errors;
}

/**
 * Parse JSON and run full validation for API create/update.
 */
export function parseAndValidateAutomationFlowGraph(
  raw: unknown,
  triggerEventNames: string[],
):
  | {
      ok: true;
      payload: AutomationFlowGraphPayload;
      validated: ValidatedFlowGraph;
    }
  | { ok: false; errors: string[] } {
  const parsed = AutomationFlowGraphPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map(
        (i) => `${i.path.join(".") || "flowGraph"}: ${i.message}`,
      ),
    };
  }
  const structural = validateAutomationFlowGraphStructure(parsed.data);
  if (!structural.ok) {
    return structural;
  }
  const actionErrors = validateAutomationFlowGraphActions(
    parsed.data,
    triggerEventNames,
  );
  if (actionErrors.length > 0) {
    return { ok: false, errors: actionErrors };
  }
  return {
    ok: true,
    payload: parsed.data,
    validated: structural.validated,
  };
}

/** Input shape for compiling the linear automation editor into a Phase 3 `flowGraph`. */
export type LinearAutomationFlowStepInput = {
  actionType: z.infer<typeof AutomationActionTypeSchema>;
  actionConfig: Record<string, unknown>;
  continueOnError?: boolean;
};

function randomUuid(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) {
    return c.randomUUID();
  }
  throw new Error(
    "crypto.randomUUID() is required to compile automation flow graphs",
  );
}

const UuidString = z.string().uuid();

/** Reuse these ids when recompiling the same number of steps (stable saves / run history). */
export type CompileLinearFlowGraphOptions = {
  entryId?: string;
  actionNodeIds?: string[];
};

function isValidUuid(s: string | undefined): s is string {
  return s != null && UuidString.safeParse(s).success;
}

/**
 * Builds a valid DAG: `entry` → `action` → … → terminal `action` (no trailing noop).
 * Use when persisting linear-authored automations as `flowGraph` (BR-19: no parallel `steps` rows).
 *
 * When `options.entryId` and `options.actionNodeIds` (same length as `steps`) are all valid UUIDs,
 * those ids are reused so repeated saves do not churn node identities.
 */
export function compileLinearStepsToFlowGraph(
  steps: LinearAutomationFlowStepInput[],
  options?: CompileLinearFlowGraphOptions,
): AutomationFlowGraphPayload {
  if (steps.length < 1) {
    throw new Error("compileLinearStepsToFlowGraph requires at least one step");
  }

  const prevEntry = options?.entryId;
  const prevActionIds = options?.actionNodeIds;
  const canReuse =
    isValidUuid(prevEntry) &&
    Array.isArray(prevActionIds) &&
    prevActionIds.length === steps.length &&
    prevActionIds.every((id) => isValidUuid(id));

  const entryId = canReuse ? prevEntry : randomUuid();
  const actionIds = canReuse
    ? [...prevActionIds]
    : steps.map(() => randomUuid());
  const nodes: AutomationFlowGraphPayload["nodes"] = [
    { id: entryId, kind: "entry" },
    ...steps.map((s, i) => ({
      id: actionIds[i]!,
      kind: "action" as const,
      config: {
        actionType: s.actionType,
        actionConfig: s.actionConfig,
        ...(s.continueOnError ? { continueOnError: true as const } : {}),
      },
    })),
  ];
  const edges: AutomationFlowGraphPayload["edges"] = [
    { fromNodeId: entryId, toNodeId: actionIds[0]! },
  ];
  for (let i = 0; i < steps.length - 1; i++) {
    edges.push({
      fromNodeId: actionIds[i]!,
      toNodeId: actionIds[i + 1]!,
    });
  }
  return { nodes, edges };
}

/** Ordered steps plus graph node ids from a decompiled linear chain (for stable recompile). */
export type DecompiledLinearChain = {
  steps: LinearAutomationFlowStepInput[];
  entryNodeId: string;
  actionNodeIds: string[];
};

/**
 * Like {@link tryDecompileLinearChainFlowGraph} but also returns `entry` and per-`action` node ids
 * in visit order (for {@link compileLinearStepsToFlowGraph} options).
 */
export function tryDecompileLinearChainFlowGraphWithIds(
  raw: unknown,
): DecompiledLinearChain | null {
  const parsed = AutomationFlowGraphPayloadSchema.safeParse(raw);
  if (!parsed.success) return null;

  for (const n of parsed.data.nodes) {
    if (n.kind === "if" || n.kind === "switch") return null;
  }

  const structural = validateAutomationFlowGraphStructure(parsed.data);
  if (!structural.ok) return null;

  const { nodesById, outgoing, entryId } = structural.validated;
  const steps: LinearAutomationFlowStepInput[] = [];
  const actionNodeIds: string[] = [];
  let cur = entryId;
  const visited = new Set<string>();

  for (let guard = 0; guard < MAX_AUTOMATION_FLOW_GRAPH_NODES + 5; guard++) {
    if (visited.has(cur)) return null;
    visited.add(cur);

    const node = nodesById.get(cur);
    if (!node) return null;

    if (node.kind === "entry" || node.kind === "noop") {
      const outs = outgoing.get(cur) ?? [];
      if (outs.length === 0) break;
      if (outs.length !== 1) return null;
      cur = outs[0]!.toNodeId;
      continue;
    }

    if (node.kind === "action") {
      actionNodeIds.push(node.id);
      steps.push({
        actionType: node.config.actionType,
        actionConfig: { ...node.config.actionConfig },
        continueOnError:
          node.config.continueOnError === true ? true : undefined,
      });
      const outs = outgoing.get(cur) ?? [];
      if (outs.length === 0) break;
      if (outs.length !== 1) return null;
      cur = outs[0]!.toNodeId;
      continue;
    }

    return null;
  }

  if (steps.length === 0) return null;
  return { steps, entryNodeId: entryId, actionNodeIds };
}

/**
 * If `raw` is a structurally valid graph made only of `entry`, `noop`, and `action` nodes
 * in a single path from `entry`, returns the ordered actions. Otherwise returns `null`
 * (branching graphs, cycles, or invalid shapes).
 */
export function tryDecompileLinearChainFlowGraph(
  raw: unknown,
): LinearAutomationFlowStepInput[] | null {
  const chain = tryDecompileLinearChainFlowGraphWithIds(raw);
  return chain?.steps ?? null;
}

/** Stable node ids when re-saving canvas-authored if/else graphs. */
export type IfElseFlowGraphCompileIds = {
  entryId: string;
  ifNodeId: string;
  trueActionId: string;
  falseActionId: string;
  noopId: string;
};

/**
 * Canonical if/else DAG: `entry` → `if` → two `action` branches → shared terminal `noop`.
 */
export function compileIfElseFlowGraph(
  input: {
    conditions: AutomationCondition[];
    trueStep: LinearAutomationFlowStepInput;
    falseStep: LinearAutomationFlowStepInput;
  },
  stableIds?: Partial<IfElseFlowGraphCompileIds>,
): AutomationFlowGraphPayload {
  if (input.conditions.length < 1) {
    throw new Error("compileIfElseFlowGraph requires at least one condition");
  }

  const entryId = isValidUuid(stableIds?.entryId)
    ? stableIds!.entryId!
    : randomUuid();
  const ifNodeId = isValidUuid(stableIds?.ifNodeId)
    ? stableIds!.ifNodeId!
    : randomUuid();
  const trueActionId = isValidUuid(stableIds?.trueActionId)
    ? stableIds!.trueActionId!
    : randomUuid();
  const falseActionId = isValidUuid(stableIds?.falseActionId)
    ? stableIds!.falseActionId!
    : randomUuid();
  const noopId = isValidUuid(stableIds?.noopId)
    ? stableIds!.noopId!
    : randomUuid();

  const nodes: AutomationFlowGraphPayload["nodes"] = [
    { id: entryId, kind: "entry" },
    {
      id: ifNodeId,
      kind: "if",
      config: { conditions: input.conditions },
    },
    {
      id: trueActionId,
      kind: "action",
      config: {
        actionType: input.trueStep.actionType,
        actionConfig: input.trueStep.actionConfig,
        ...(input.trueStep.continueOnError
          ? { continueOnError: true as const }
          : {}),
      },
    },
    {
      id: falseActionId,
      kind: "action",
      config: {
        actionType: input.falseStep.actionType,
        actionConfig: input.falseStep.actionConfig,
        ...(input.falseStep.continueOnError
          ? { continueOnError: true as const }
          : {}),
      },
    },
    { id: noopId, kind: "noop" },
  ];

  const edges: AutomationFlowGraphPayload["edges"] = [
    { fromNodeId: entryId, toNodeId: ifNodeId },
    {
      fromNodeId: ifNodeId,
      toNodeId: trueActionId,
      edgeKey: "true",
    },
    {
      fromNodeId: ifNodeId,
      toNodeId: falseActionId,
      edgeKey: "false",
    },
    { fromNodeId: trueActionId, toNodeId: noopId },
    { fromNodeId: falseActionId, toNodeId: noopId },
  ];

  const graph = { nodes, edges };
  const structural = validateAutomationFlowGraphStructure(graph);
  if (!structural.ok) {
    throw new Error(structural.errors.join("; "));
  }
  return graph;
}

export type SwitchFlowGraphCompileIds = {
  entryId: string;
  switchId: string;
  noopId: string;
  caseActionIds: string[];
  defaultActionId: string;
};

/**
 * Canonical switch DAG: `entry` → `switch` → one `action` per case + `default` `action` → shared `noop`.
 * Non-default edges are emitted in `cases` order (first match wins at runtime).
 */
export function compileSwitchFlowGraph(
  input: {
    discriminantPath: string;
    cases: Array<{ edgeKey: string; step: LinearAutomationFlowStepInput }>;
    defaultStep: LinearAutomationFlowStepInput;
  },
  stableIds?: Partial<SwitchFlowGraphCompileIds>,
): AutomationFlowGraphPayload {
  const path = input.discriminantPath.trim();
  if (path.length < 1) {
    throw new Error("compileSwitchFlowGraph requires discriminantPath");
  }
  if (input.cases.length < 1) {
    throw new Error(
      "compileSwitchFlowGraph requires at least one non-default case",
    );
  }

  const entryId = isValidUuid(stableIds?.entryId)
    ? stableIds!.entryId!
    : randomUuid();
  const switchId = isValidUuid(stableIds?.switchId)
    ? stableIds!.switchId!
    : randomUuid();
  const noopId = isValidUuid(stableIds?.noopId)
    ? stableIds!.noopId!
    : randomUuid();

  const prevCaseIds = stableIds?.caseActionIds;
  const caseActionIds =
    Array.isArray(prevCaseIds) &&
    prevCaseIds.length === input.cases.length &&
    prevCaseIds.every((id) => isValidUuid(id))
      ? [...prevCaseIds]
      : input.cases.map(() => randomUuid());

  const defaultActionId = isValidUuid(stableIds?.defaultActionId)
    ? stableIds!.defaultActionId!
    : randomUuid();

  const nodes: AutomationFlowGraphPayload["nodes"] = [
    { id: entryId, kind: "entry" },
    {
      id: switchId,
      kind: "switch",
      config: { discriminantPath: path },
    },
    ...input.cases.map((c, i) => ({
      id: caseActionIds[i]!,
      kind: "action" as const,
      config: {
        actionType: c.step.actionType,
        actionConfig: c.step.actionConfig,
        ...(c.step.continueOnError ? { continueOnError: true as const } : {}),
      },
    })),
    {
      id: defaultActionId,
      kind: "action",
      config: {
        actionType: input.defaultStep.actionType,
        actionConfig: input.defaultStep.actionConfig,
        ...(input.defaultStep.continueOnError
          ? { continueOnError: true as const }
          : {}),
      },
    },
    { id: noopId, kind: "noop" },
  ];

  const edges: AutomationFlowGraphPayload["edges"] = [
    { fromNodeId: entryId, toNodeId: switchId },
    ...input.cases.map((c, i) => ({
      fromNodeId: switchId,
      toNodeId: caseActionIds[i]!,
      edgeKey: c.edgeKey,
    })),
    {
      fromNodeId: switchId,
      toNodeId: defaultActionId,
      edgeKey: "default",
    },
    ...input.cases.map((_, i) => ({
      fromNodeId: caseActionIds[i]!,
      toNodeId: noopId,
    })),
    { fromNodeId: defaultActionId, toNodeId: noopId },
  ];

  const graph = { nodes, edges };
  const structural = validateAutomationFlowGraphStructure(graph);
  if (!structural.ok) {
    throw new Error(structural.errors.join("; "));
  }
  return graph;
}

function linearStepFromActionNode(
  n: Extract<FlowGraphNode, { kind: "action" }>,
): LinearAutomationFlowStepInput {
  return {
    actionType: n.config.actionType,
    actionConfig: { ...n.config.actionConfig },
    continueOnError: n.config.continueOnError === true ? true : undefined,
  };
}

/** Payload for the canvas if/else editor (round-trip with {@link compileIfElseFlowGraph}). */
export type IfElseAuthoringExtract = {
  conditions: AutomationCondition[];
  trueStep: LinearAutomationFlowStepInput;
  falseStep: LinearAutomationFlowStepInput;
  ids: IfElseFlowGraphCompileIds;
};

/**
 * If `raw` matches the canonical if/else shape from {@link compileIfElseFlowGraph}, returns editor fields + stable ids.
 */
export function tryExtractIfElseAuthoringFromGraph(
  raw: unknown,
): IfElseAuthoringExtract | null {
  const parsed = AutomationFlowGraphPayloadSchema.safeParse(raw);
  if (!parsed.success) return null;
  const structural = validateAutomationFlowGraphStructure(parsed.data);
  if (!structural.ok) return null;
  const { nodesById, outgoing, entryId } = structural.validated;

  const fromEntry = outgoing.get(entryId) ?? [];
  if (fromEntry.length !== 1) return null;
  const ifNodeId = fromEntry[0]!.toNodeId;
  const ifNode = nodesById.get(ifNodeId);
  if (!ifNode || ifNode.kind !== "if") return null;

  const ifOuts = outgoing.get(ifNodeId) ?? [];
  if (ifOuts.length !== 2) return null;
  const trueEdge = ifOuts.find((o) => o.edgeKey === "true");
  const falseEdge = ifOuts.find((o) => o.edgeKey === "false");
  if (!trueEdge || !falseEdge) return null;

  const trueNode = nodesById.get(trueEdge.toNodeId);
  const falseNode = nodesById.get(falseEdge.toNodeId);
  if (!trueNode || trueNode.kind !== "action") return null;
  if (!falseNode || falseNode.kind !== "action") return null;

  const trueOuts = outgoing.get(trueNode.id) ?? [];
  const falseOuts = outgoing.get(falseNode.id) ?? [];
  if (trueOuts.length !== 1 || falseOuts.length !== 1) return null;
  if (trueOuts[0]!.toNodeId !== falseOuts[0]!.toNodeId) return null;

  const noopId = trueOuts[0]!.toNodeId;
  const noop = nodesById.get(noopId);
  if (!noop || noop.kind !== "noop") return null;
  if ((outgoing.get(noopId) ?? []).length !== 0) return null;

  return {
    conditions: [...ifNode.config.conditions],
    trueStep: linearStepFromActionNode(trueNode),
    falseStep: linearStepFromActionNode(falseNode),
    ids: {
      entryId,
      ifNodeId,
      trueActionId: trueNode.id,
      falseActionId: falseNode.id,
      noopId,
    },
  };
}

/** Payload for the canvas switch editor (round-trip with {@link compileSwitchFlowGraph}). */
export type SwitchAuthoringExtract = {
  discriminantPath: string;
  cases: Array<{ edgeKey: string; step: LinearAutomationFlowStepInput }>;
  defaultStep: LinearAutomationFlowStepInput;
  ids: SwitchFlowGraphCompileIds;
};

/**
 * If `raw` matches the canonical switch shape from {@link compileSwitchFlowGraph}, returns editor fields + stable ids.
 */
export function tryExtractSwitchAuthoringFromGraph(
  raw: unknown,
): SwitchAuthoringExtract | null {
  if (tryExtractIfElseAuthoringFromGraph(raw) != null) return null;

  const parsed = AutomationFlowGraphPayloadSchema.safeParse(raw);
  if (!parsed.success) return null;
  const structural = validateAutomationFlowGraphStructure(parsed.data);
  if (!structural.ok) return null;
  const { nodesById, outgoing, entryId } = structural.validated;

  const fromEntry = outgoing.get(entryId) ?? [];
  if (fromEntry.length !== 1) return null;
  const switchId = fromEntry[0]!.toNodeId;
  const sw = nodesById.get(switchId);
  if (!sw || sw.kind !== "switch") return null;

  const swOuts = outgoing.get(switchId) ?? [];
  if (swOuts.length < 2) return null;

  const defaultEdges = swOuts.filter((o) => o.edgeKey === "default");
  if (defaultEdges.length !== 1) return null;
  const defaultTo = defaultEdges[0]!.toNodeId;
  const defaultNode = nodesById.get(defaultTo);
  if (!defaultNode || defaultNode.kind !== "action") return null;

  const caseEdges = swOuts.filter((o) => o.edgeKey !== "default");
  if (caseEdges.length < 1) return null;

  const noopFromDefault = outgoing.get(defaultNode.id) ?? [];
  if (noopFromDefault.length !== 1) return null;
  const noopId = noopFromDefault[0]!.toNodeId;
  const noop = nodesById.get(noopId);
  if (!noop || noop.kind !== "noop") return null;
  if ((outgoing.get(noopId) ?? []).length !== 0) return null;

  const cases: SwitchAuthoringExtract["cases"] = [];
  const caseActionIds: string[] = [];

  for (const e of caseEdges) {
    const key = e.edgeKey;
    if (key == null || key === "") return null;
    const act = nodesById.get(e.toNodeId);
    if (!act || act.kind !== "action") return null;
    const actOuts = outgoing.get(act.id) ?? [];
    if (actOuts.length !== 1 || actOuts[0]!.toNodeId !== noopId) return null;
    cases.push({ edgeKey: key, step: linearStepFromActionNode(act) });
    caseActionIds.push(act.id);
  }

  return {
    discriminantPath: sw.config.discriminantPath,
    cases,
    defaultStep: linearStepFromActionNode(defaultNode),
    ids: {
      entryId,
      switchId,
      noopId,
      caseActionIds,
      defaultActionId: defaultNode.id,
    },
  };
}
