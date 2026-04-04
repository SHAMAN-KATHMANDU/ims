import type { Edge, Node } from "@xyflow/react";
import {
  AUTOMATION_ACTION_TYPE_DESCRIPTIONS,
  AutomationFlowGraphPayloadSchema,
  type AutomationFlowGraphPayload,
} from "@repo/shared";

type GraphNode = AutomationFlowGraphPayload["nodes"][number];

const LEVEL_X = 260;
const ROW_Y = 100;

export function flowGraphNodeLabel(node: GraphNode): string {
  switch (node.kind) {
    case "entry":
      return "Start";
    case "noop":
      return "Pass-through";
    case "action": {
      const meta =
        AUTOMATION_ACTION_TYPE_DESCRIPTIONS[
          node.config
            .actionType as keyof typeof AUTOMATION_ACTION_TYPE_DESCRIPTIONS
        ];
      return meta?.label ?? node.config.actionType;
    }
    case "if":
      return "If";
    case "switch": {
      const p = node.config.discriminantPath;
      return p ? `Switch (${p})` : "Switch";
    }
    default:
      return "Node";
  }
}

export function extractGraphBranchDecisions(
  stepOutput: Record<string, unknown> | null | undefined,
): Record<string, string> | null {
  const meta = stepOutput?.["__automationGraph"];
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const bd = (meta as { branchDecisions?: unknown }).branchDecisions;
  if (!bd || typeof bd !== "object" || Array.isArray(bd)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(bd as Record<string, unknown>)) {
    if (typeof v === "string" && v.length > 0) out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function humanizeBranchArm(nodeKind: string, key: string): string {
  if (nodeKind === "if") {
    if (key === "true") return "Then (conditions met)";
    if (key === "false") return "Else (conditions not met)";
  }
  if (nodeKind === "switch") {
    if (key === "default") return "Default branch";
    return `Case "${key}"`;
  }
  return `Route: ${key}`;
}

/**
 * For each routing node in `decisions`, lists outgoing arms from the graph that
 * were not taken (single-path execution). Requires a parseable `flowGraph`
 * with keyed edges from `if` / `switch` nodes.
 */
export function describeSkippedBranchArmsLines(
  flowGraph: unknown | null | undefined,
  decisions: Record<string, string>,
): string[] {
  const parsed = flowGraph
    ? AutomationFlowGraphPayloadSchema.safeParse(flowGraph)
    : null;
  if (!parsed?.success) return [];

  const { nodes, edges } = parsed.data;
  const byId = new Map<string, GraphNode>();
  for (const n of nodes) {
    byId.set(n.id, n);
  }

  const keysByFrom = new Map<string, string[]>();
  for (const e of edges) {
    if (e.edgeKey == null || e.edgeKey === "") continue;
    const k = String(e.edgeKey);
    const list = keysByFrom.get(e.fromNodeId) ?? [];
    list.push(k);
    keysByFrom.set(e.fromNodeId, list);
  }

  const lines: string[] = [];
  for (const [nodeId, chosenKey] of Object.entries(decisions)) {
    const node = byId.get(nodeId);
    if (!node || (node.kind !== "if" && node.kind !== "switch")) continue;

    const armKeys = keysByFrom.get(nodeId);
    if (!armKeys?.length) continue;

    const nodeName = flowGraphNodeLabel(node);
    const skipped = armKeys.filter((k) => k !== chosenKey);
    for (const sk of skipped) {
      lines.push(
        `${nodeName} → not taken: ${humanizeBranchArm(node.kind, sk)}`,
      );
    }
  }
  return lines;
}

export function describeBranchDecisionLines(
  flowGraph: unknown | null | undefined,
  decisions: Record<string, string>,
): string[] {
  const parsed = flowGraph
    ? AutomationFlowGraphPayloadSchema.safeParse(flowGraph)
    : null;
  const byId = new Map<string, { kind: string; label: string }>();
  if (parsed?.success) {
    for (const n of parsed.data.nodes) {
      byId.set(n.id, { kind: n.kind, label: flowGraphNodeLabel(n) });
    }
  }

  return Object.entries(decisions).map(([nodeId, key]) => {
    const meta = byId.get(nodeId);
    const nodeName = meta?.label ?? `Node ${nodeId.slice(0, 8)}…`;
    const arm = humanizeBranchArm(meta?.kind ?? "unknown", key);
    return `${nodeName} → ${arm}`;
  });
}

function previewNodeType(kind: GraphNode["kind"]): string {
  switch (kind) {
    case "entry":
      return "automationPreviewEntry";
    case "noop":
      return "automationPreviewNoop";
    case "action":
      return "automationPreviewAction";
    case "if":
      return "automationPreviewIf";
    case "switch":
      return "automationPreviewSwitch";
    default:
      return "automationPreviewNoop";
  }
}

/**
 * Maps a validated automation flowGraph payload to React Flow nodes/edges (read-only previews).
 */
export function tryFlowGraphPayloadToReactFlow(
  raw: unknown,
): { nodes: Node[]; edges: Edge[] } | null {
  const parsed = AutomationFlowGraphPayloadSchema.safeParse(raw);
  if (!parsed.success) return null;

  const { nodes: gn, edges: ge } = parsed.data;
  const outgoing = new Map<string, Array<{ to: string }>>();
  for (const e of ge) {
    const list = outgoing.get(e.fromNodeId) ?? [];
    list.push({ to: e.toNodeId });
    outgoing.set(e.fromNodeId, list);
  }

  const entry = gn.find((n) => n.kind === "entry");
  if (!entry) return null;

  const depth = new Map<string, number>();
  const queue: string[] = [entry.id];
  depth.set(entry.id, 0);

  while (queue.length > 0) {
    const id = queue.shift()!;
    const d = depth.get(id)!;
    for (const { to } of outgoing.get(id) ?? []) {
      if (!depth.has(to)) {
        depth.set(to, d + 1);
        queue.push(to);
      }
    }
  }

  const byLevel = new Map<number, string[]>();
  for (const n of gn) {
    const lv = depth.get(n.id) ?? 0;
    const row = byLevel.get(lv) ?? [];
    row.push(n.id);
    byLevel.set(lv, row);
  }

  const positions = new Map<string, { x: number; y: number }>();
  for (const [lv, ids] of byLevel) {
    ids.forEach((id, i) => {
      positions.set(id, { x: lv * LEVEL_X, y: i * ROW_Y });
    });
  }

  const nodes: Node[] = gn.map((n) => ({
    id: n.id,
    type: previewNodeType(n.kind),
    position: positions.get(n.id) ?? { x: 0, y: 0 },
    data: {
      label: flowGraphNodeLabel(n),
      actionType: n.kind === "action" ? n.config.actionType : undefined,
    },
  }));

  const edges: Edge[] = ge.map((e, i) => ({
    id: `preview-e-${i}-${e.fromNodeId}-${e.toNodeId}`,
    source: e.fromNodeId,
    target: e.toNodeId,
    label: e.edgeKey != null ? String(e.edgeKey) : undefined,
  }));

  return { nodes, edges };
}
