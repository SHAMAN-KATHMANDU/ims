"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AUTOMATION_ACTION_TYPE_DESCRIPTIONS,
  AUTOMATION_ACTION_TYPE_VALUES,
  compileIfElseFlowGraph,
  compileLinearStepsToFlowGraph,
  compileSwitchFlowGraph,
  isAutomationActionAllowedForEvent,
} from "@repo/shared";
import type { AutomationActionTypeValue } from "@repo/shared";
import { EnvFeature, useEnvFeatureFlag } from "@/features/flags";
import {
  ActionConfigFields,
  getDefaultActionConfig,
} from "./automation-action-config-fields";
import { useAutomationFlowCompileStableIds } from "./automation-flow-compile-meta-context";
import { AutomationBranchingAuthoringPanel } from "./AutomationBranchingAuthoringPanel";
import { AutomationFlowGraphPreview } from "./AutomationFlowGraphPreview";
import type { AutomationDefinitionFormValues } from "../validation";
import {
  automationFormValuesToFlowGraph,
  reorderStepsByFlowOrder,
} from "../utils/automation-flow-graph";

function TriggersNode(props: NodeProps): React.ReactElement {
  const data = props.data as { summary: string; count: number };
  return (
    <div className="min-w-[200px] rounded-lg border-2 border-primary bg-card px-3 py-2 shadow-sm">
      <Handle type="source" position={Position.Right} />
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        When
      </p>
      <p className="text-sm font-semibold">
        {data.count} trigger{data.count === 1 ? "" : "s"}
      </p>
      <p className="mt-1 line-clamp-4 text-xs text-muted-foreground">
        {data.summary}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Use <strong>All fields</strong> to edit triggers and conditions.
      </p>
    </div>
  );
}

function StepNode(props: NodeProps): React.ReactElement {
  const data = props.data as {
    stepIndex: number;
    actionType: string;
    title: string;
  };
  return (
    <div className="min-w-[200px] rounded-lg border bg-card px-3 py-2 shadow-sm">
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Step {data.stepIndex + 1}
      </p>
      <p className="text-sm font-semibold leading-snug">{data.title}</p>
      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
        {data.actionType}
      </p>
    </div>
  );
}

const nodeTypes = {
  automationTriggers: TriggersNode,
  automationStep: StepNode,
};

export function AutomationFlowCanvas(): React.ReactElement {
  const form = useFormContext<AutomationDefinitionFormValues>();
  const flowRef = useRef<ReactFlowInstance | null>(null);
  const triggers = useWatch({ control: form.control, name: "triggers" });
  const steps = useWatch({ control: form.control, name: "steps" });
  const branchingCanvasAuthoring = useWatch({
    control: form.control,
    name: "branchingCanvasAuthoring",
  });

  const slice = useMemo(
    () => ({ triggers: triggers ?? [], steps: steps ?? [] }),
    [triggers, steps],
  );

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => automationFormValuesToFlowGraph(slice),
    [slice],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (
      selectedStepIndex != null &&
      selectedStepIndex >= (steps?.length ?? 0)
    ) {
      setSelectedStepIndex(null);
    }
  }, [selectedStepIndex, steps?.length]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (
      node.type === "automationStep" &&
      typeof node.data.stepIndex === "number"
    ) {
      setSelectedStepIndex(node.data.stepIndex as number);
      return;
    }
    setSelectedStepIndex(null);
  }, []);

  const onNodeDragStop = useCallback(() => {
    const all = flowRef.current?.getNodes() ?? [];
    const positions = all.map((n) => ({ id: n.id, x: n.position.x }));
    const currentSteps = form.getValues("steps");
    const nextOrder = reorderStepsByFlowOrder(currentSteps, positions);
    if (JSON.stringify(nextOrder) !== JSON.stringify(currentSteps)) {
      form.setValue("steps", nextOrder, { shouldValidate: true });
    }
  }, [form]);

  const compatibleActionTypes = useMemo(() => {
    const events = (triggers ?? []).map((t) => t.eventName);
    return AUTOMATION_ACTION_TYPE_VALUES.filter((actionType) =>
      events.some((eventName) =>
        isAutomationActionAllowedForEvent(actionType, eventName),
      ),
    );
  }, [triggers]);

  const automationBranchingEnabled = useEnvFeatureFlag(
    EnvFeature.AUTOMATION_BRANCHING,
  );

  const startIfElseBranching = useCallback(() => {
    const notify = getDefaultActionConfig("notification.send");
    const g = compileIfElseFlowGraph({
      conditions: [{ path: "total", operator: "gte", value: 1000 }],
      trueStep: {
        actionType: "notification.send",
        actionConfig: notify,
      },
      falseStep: {
        actionType: "notification.send",
        actionConfig: getDefaultActionConfig("notification.send"),
      },
    });
    form.setValue("branchingCanvasAuthoring", true, { shouldValidate: true });
    form.setValue("preservedBranchingFlowGraph", g, { shouldValidate: true });
    form.setValue("steps", [], { shouldValidate: true });
    setSelectedStepIndex(null);
  }, [form]);

  const startSwitchBranching = useCallback(() => {
    const caseStep = {
      actionType: "notification.send" as const,
      actionConfig: getDefaultActionConfig("notification.send"),
    };
    const g = compileSwitchFlowGraph({
      discriminantPath: "region",
      cases: [{ edgeKey: "east", step: caseStep }],
      defaultStep: {
        actionType: "notification.send",
        actionConfig: getDefaultActionConfig("notification.send"),
      },
    });
    form.setValue("branchingCanvasAuthoring", true, { shouldValidate: true });
    form.setValue("preservedBranchingFlowGraph", g, { shouldValidate: true });
    form.setValue("steps", [], { shouldValidate: true });
    setSelectedStepIndex(null);
  }, [form]);

  const backToLinearSteps = useCallback(() => {
    const first =
      compatibleActionTypes[0] ??
      ("notification.send" as AutomationActionTypeValue);
    form.setValue("branchingCanvasAuthoring", false, { shouldValidate: true });
    form.setValue("preservedBranchingFlowGraph", undefined, {
      shouldValidate: true,
    });
    form.setValue(
      "steps",
      [
        {
          actionType: first,
          actionConfig: getDefaultActionConfig(first),
          continueOnError: false,
        },
      ],
      { shouldValidate: true },
    );
  }, [compatibleActionTypes, form]);

  const flowCompileStableIds = useAutomationFlowCompileStableIds();

  const compiledGraphForSavePreview = useMemo(() => {
    if (!automationBranchingEnabled || !steps?.length) {
      return null;
    }
    try {
      const stableCompileOptions =
        flowCompileStableIds &&
        steps.length === flowCompileStableIds.actionNodeIds.length
          ? {
              entryId: flowCompileStableIds.entryId,
              actionNodeIds: flowCompileStableIds.actionNodeIds,
            }
          : undefined;
      return compileLinearStepsToFlowGraph(
        steps.map((step) => ({
          actionType: step.actionType,
          actionConfig: step.actionConfig,
          ...(step.continueOnError ? { continueOnError: true as const } : {}),
        })),
        stableCompileOptions,
      );
    } catch {
      return null;
    }
  }, [automationBranchingEnabled, flowCompileStableIds, steps]);

  const appendStep = () => {
    const cur = form.getValues("steps");
    form.setValue(
      "steps",
      [
        ...cur,
        {
          actionType: "notification.send",
          actionConfig: getDefaultActionConfig("notification.send"),
          continueOnError: false,
        },
      ],
      { shouldValidate: true },
    );
  };

  const appendTrigger = () => {
    const cur = form.getValues("triggers");
    form.setValue(
      "triggers",
      [
        ...cur,
        {
          eventName: "sales.sale.created",
          conditions: [],
          delayMinutes: 0,
        },
      ],
      { shouldValidate: true },
    );
  };

  const stepCount = steps?.length ?? 0;
  const inspectorIndex =
    selectedStepIndex != null &&
    selectedStepIndex >= 0 &&
    selectedStepIndex < stepCount
      ? selectedStepIndex
      : null;

  const actionType =
    inspectorIndex != null
      ? form.watch(`steps.${inspectorIndex}.actionType`)
      : null;
  const actionConfig =
    inspectorIndex != null
      ? ((form.watch(`steps.${inspectorIndex}.actionConfig`) as Record<
          string,
          unknown
        >) ?? {})
      : {};

  if (automationBranchingEnabled && branchingCanvasAuthoring) {
    return (
      <div className="flex min-h-[440px] flex-col gap-4 rounded-lg border bg-muted/20">
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={backToLinearSteps}
          >
            Back to linear steps
          </Button>
        </div>
        <AutomationBranchingAuthoringPanel
          compatibleActionTypes={compatibleActionTypes}
        />
        <p className="px-3 text-xs text-muted-foreground">
          Saving persists the previewed{" "}
          <code className="rounded bg-muted px-0.5 text-[10px]">flowGraph</code>{" "}
          with no separate linear steps.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[440px] flex-col gap-4 rounded-lg border bg-muted/20">
      <div className="h-[360px] w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onInit={(inst) => {
            flowRef.current = inst;
          }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onNodeDragStop={onNodeDragStop}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <MiniMap zoomable pannable />
          <Panel position="top-left" className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={appendTrigger}
            >
              Add trigger
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={appendStep}
            >
              Add step
            </Button>
            {automationBranchingEnabled ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={startIfElseBranching}
                >
                  If / else graph
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={startSwitchBranching}
                >
                  Switch graph
                </Button>
              </>
            ) : null}
          </Panel>
        </ReactFlow>
      </div>
      {compiledGraphForSavePreview ? (
        <div className="border-t bg-muted/10 px-3 py-3">
          <p className="mb-1 text-xs font-medium text-foreground">
            Stored graph shape on save
          </p>
          <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
            With branching enabled, the server stores a{" "}
            <code className="rounded bg-muted px-0.5 text-[10px]">
              flowGraph
            </code>{" "}
            compiled from this line. Use{" "}
            <strong className="font-medium text-foreground">
              If / else graph
            </strong>{" "}
            or{" "}
            <strong className="font-medium text-foreground">
              Switch graph
            </strong>{" "}
            on the canvas to author branching here.
          </p>
          <ReactFlowProvider>
            <AutomationFlowGraphPreview
              flowGraph={compiledGraphForSavePreview}
              className="h-[200px] min-h-[180px] w-full rounded-md border bg-background"
            />
          </ReactFlowProvider>
        </div>
      ) : null}
      <p className="px-3 text-xs text-muted-foreground">
        {automationBranchingEnabled
          ? "Drag step cards horizontally to reorder, or start an If/else or Switch graph. Saving persists the graph shown above."
          : "Drag step cards horizontally to reorder. Branching (if/split) is not available yet—steps always run in order."}
      </p>
      {inspectorIndex != null && actionType ? (
        <div className="space-y-3 border-t bg-card px-3 py-3">
          <p className="text-sm font-medium">
            Step {inspectorIndex + 1} — configure action
          </p>
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
            <Select
              value={actionType}
              onValueChange={(next) => {
                const typed = next as AutomationActionTypeValue;
                form.setValue(`steps.${inspectorIndex}.actionType`, typed);
                form.setValue(
                  `steps.${inspectorIndex}.actionConfig`,
                  getDefaultActionConfig(typed),
                );
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                {compatibleActionTypes.map((action) => {
                  const meta = AUTOMATION_ACTION_TYPE_DESCRIPTIONS[action];
                  return (
                    <SelectItem
                      key={action}
                      value={action}
                      textValue={meta.label}
                    >
                      <span className="flex flex-col items-start gap-0.5 py-0.5 text-left">
                        <span>{meta.label}</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          {meta.description}
                        </span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.watch(`steps.${inspectorIndex}.continueOnError`)}
                onCheckedChange={(checked) =>
                  form.setValue(
                    `steps.${inspectorIndex}.continueOnError`,
                    checked,
                  )
                }
              />
              <Label>Continue on error</Label>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => {
                const cur = form.getValues("steps");
                form.setValue(
                  "steps",
                  cur.filter((_, i) => i !== inspectorIndex),
                  { shouldValidate: true },
                );
                setSelectedStepIndex(null);
              }}
            >
              Remove step
            </Button>
          </div>
          <ActionConfigFields
            actionType={actionType}
            value={actionConfig}
            onChange={(next) =>
              form.setValue(`steps.${inspectorIndex}.actionConfig`, next, {
                shouldValidate: true,
              })
            }
          />
        </div>
      ) : (
        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
          Select a step node to edit its action. Triggers are edited under{" "}
          <strong>All fields</strong>.
        </div>
      )}
    </div>
  );
}
