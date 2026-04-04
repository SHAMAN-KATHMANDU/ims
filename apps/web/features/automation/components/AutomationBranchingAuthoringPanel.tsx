"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AUTOMATION_ACTION_TYPE_DESCRIPTIONS,
  AUTOMATION_CONDITION_OPERATORS,
  MAX_CONDITIONS_PER_IF_NODE,
  MAX_SWITCH_OUT_EDGES,
  compileComposableFlowSegments,
  compileIfElseFlowGraph,
  compileSwitchFlowGraph,
  composableSegmentsFitBr11Limits,
  estimateComposableSegmentsFootprint,
  tryExtractComposableFlowSegments,
  tryExtractIfElseAuthoringFromGraph,
  tryExtractSwitchAuthoringFromGraph,
  type AutomationActionTypeValue,
  type AutomationCondition,
  type ComposableFlowSegment,
  type LinearAutomationFlowStepInput,
} from "@repo/shared";
import { ReactFlowProvider } from "@xyflow/react";
import {
  ActionConfigFields,
  getDefaultActionConfig,
} from "./automation-action-config-fields";
import { AutomationFlowGraphPreview } from "./AutomationFlowGraphPreview";
import type { AutomationDefinitionFormValues } from "../validation";

function defaultNotificationStep(): LinearAutomationFlowStepInput {
  return {
    actionType: "notification.send",
    actionConfig: getDefaultActionConfig("notification.send"),
  };
}

function defaultCondition(): AutomationCondition {
  return { path: "total", operator: "gte", value: 1000 };
}

function defaultIfElseSegment(): ComposableFlowSegment {
  const g = compileIfElseFlowGraph({
    conditions: [defaultCondition()],
    trueStep: defaultNotificationStep(),
    falseStep: defaultNotificationStep(),
  });
  const ex = tryExtractComposableFlowSegments(g);
  return (
    ex?.[0] ?? {
      kind: "if_else",
      conditions: [defaultCondition()],
      trueStep: defaultNotificationStep(),
      falseStep: defaultNotificationStep(),
    }
  );
}

function defaultSwitchSegment(): ComposableFlowSegment {
  const g = compileSwitchFlowGraph({
    discriminantPath: "region",
    cases: [{ edgeKey: "east", step: defaultNotificationStep() }],
    defaultStep: defaultNotificationStep(),
  });
  const ex = tryExtractComposableFlowSegments(g);
  return (
    ex?.[0] ?? {
      kind: "switch",
      discriminantPath: "region",
      cases: [{ edgeKey: "east", step: defaultNotificationStep() }],
      defaultStep: defaultNotificationStep(),
    }
  );
}

function defaultActionSegment(): ComposableFlowSegment {
  return {
    kind: "action",
    step: defaultNotificationStep(),
  };
}

function readEntryIdFromGraph(graph: unknown): string | undefined {
  if (!graph || typeof graph !== "object") return undefined;
  const nodes = (graph as { nodes?: { id: string; kind: string }[] }).nodes;
  const e = nodes?.find((n) => n.kind === "entry");
  return typeof e?.id === "string" ? e.id : undefined;
}

function initialSegmentsFromGraph(graph: unknown): ComposableFlowSegment[] {
  const composed = tryExtractComposableFlowSegments(graph);
  if (composed && composed.length > 0) return composed;

  const ifEx = tryExtractIfElseAuthoringFromGraph(graph);
  if (ifEx) {
    return [
      {
        kind: "if_else",
        conditions: ifEx.conditions,
        trueStep: ifEx.trueStep,
        falseStep: ifEx.falseStep,
        ids: {
          ifNodeId: ifEx.ids.ifNodeId,
          trueActionId: ifEx.ids.trueActionId,
          falseActionId: ifEx.ids.falseActionId,
          noopId: ifEx.ids.noopId,
        },
      },
    ];
  }

  const swEx = tryExtractSwitchAuthoringFromGraph(graph);
  if (swEx) {
    return [
      {
        kind: "switch",
        discriminantPath: swEx.discriminantPath,
        cases: swEx.cases,
        defaultStep: swEx.defaultStep,
        ids: {
          switchId: swEx.ids.switchId,
          noopId: swEx.ids.noopId,
          caseActionIds: swEx.ids.caseActionIds,
          defaultActionId: swEx.ids.defaultActionId,
        },
      },
    ];
  }

  return [defaultIfElseSegment()];
}

function BranchActionBlock(props: {
  title: string;
  step: LinearAutomationFlowStepInput;
  compatibleActionTypes: AutomationActionTypeValue[];
  onChangeStep: (next: LinearAutomationFlowStepInput) => void;
}): React.ReactElement {
  const { title, step, compatibleActionTypes, onChangeStep } = props;
  return (
    <div className="space-y-2 rounded-md border bg-card p-3">
      <p className="text-sm font-medium">{title}</p>
      <Select
        value={step.actionType}
        onValueChange={(next) => {
          const typed = next as AutomationActionTypeValue;
          onChangeStep({
            actionType: typed,
            actionConfig: getDefaultActionConfig(typed),
            continueOnError: step.continueOnError,
          });
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Action" />
        </SelectTrigger>
        <SelectContent>
          {compatibleActionTypes.map((action) => {
            const meta = AUTOMATION_ACTION_TYPE_DESCRIPTIONS[action];
            return (
              <SelectItem key={action} value={action} textValue={meta.label}>
                {meta.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <Switch
          checked={Boolean(step.continueOnError)}
          onCheckedChange={(checked) =>
            onChangeStep({
              ...step,
              continueOnError: checked ? true : undefined,
            })
          }
        />
        <Label className="text-xs">Continue on error</Label>
      </div>
      <ActionConfigFields
        actionType={step.actionType}
        value={step.actionConfig as Record<string, unknown>}
        onChange={(next) => onChangeStep({ ...step, actionConfig: next })}
      />
    </div>
  );
}

interface AutomationBranchingAuthoringPanelProps {
  compatibleActionTypes: AutomationActionTypeValue[];
  /**
   * When false, hide the embedded graph preview (Flow chart column shows it).
   */
  showGraphPreview?: boolean;
}

export function AutomationBranchingAuthoringPanel({
  compatibleActionTypes,
  showGraphPreview = true,
}: AutomationBranchingAuthoringPanelProps): React.ReactElement {
  const form = useFormContext<AutomationDefinitionFormValues>();
  const preserved = useWatch({
    control: form.control,
    name: "preservedBranchingFlowGraph",
  });

  const preservedFingerprint = useMemo(
    () => JSON.stringify(preserved ?? null),
    [preserved],
  );

  const [segments, setSegments] = useState<ComposableFlowSegment[]>(() =>
    initialSegmentsFromGraph(preserved),
  );

  useEffect(() => {
    const next = initialSegmentsFromGraph(preserved);
    setSegments((prev) =>
      JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
    );
  }, [preservedFingerprint, preserved]);

  useEffect(() => {
    try {
      const entryId = readEntryIdFromGraph(
        form.getValues("preservedBranchingFlowGraph"),
      );
      const nextGraph = compileComposableFlowSegments(segments, {
        entryId,
      });
      const cur = form.getValues("preservedBranchingFlowGraph");
      if (JSON.stringify(cur ?? null) === JSON.stringify(nextGraph)) {
        return;
      }
      form.setValue("preservedBranchingFlowGraph", nextGraph, {
        shouldValidate: true,
      });
      if ((form.getValues("steps") ?? []).length > 0) {
        form.setValue("steps", [], { shouldValidate: true });
      }
    } catch {
      /* surfaced via form validation */
    }
  }, [segments, form]);

  const previewGraph = useWatch({
    control: form.control,
    name: "preservedBranchingFlowGraph",
  });

  const br11Hint = useMemo(() => {
    const next = [...segments];
    const withAction = [...next, defaultActionSegment()];
    const withIf = [...next, defaultIfElseSegment()];
    return {
      canAddAction: composableSegmentsFitBr11Limits(withAction),
      canAddIf: composableSegmentsFitBr11Limits(withIf),
      canAddSwitch: composableSegmentsFitBr11Limits([
        ...next,
        defaultSwitchSegment(),
      ]),
      footprint: estimateComposableSegmentsFootprint(segments),
    };
  }, [segments]);

  const replaceSingleSegmentKind = useCallback((kind: "if_else" | "switch") => {
    setSegments(() =>
      kind === "if_else" ? [defaultIfElseSegment()] : [defaultSwitchSegment()],
    );
  }, []);

  const updateSegment = useCallback(
    (index: number, next: ComposableFlowSegment) => {
      setSegments((prev) => {
        const copy = [...prev];
        copy[index] = next;
        return copy;
      });
    },
    [],
  );

  const removeSegment = useCallback((index: number) => {
    setSegments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addSegment = useCallback((seg: ComposableFlowSegment) => {
    setSegments((prev) => [...prev, seg]);
  }, []);

  return (
    <div className="flex min-h-[440px] flex-col gap-4 rounded-lg border bg-muted/20">
      <div className="space-y-2 border-b px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            Routing timeline
          </span>
          <span className="text-xs text-muted-foreground">
            When triggers match, the run follows one path through these blocks
            (AND only per if; use another if block for OR-style logic).
          </span>
        </div>
        {segments.length === 1 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Block type</span>
            <Button
              type="button"
              size="sm"
              variant={segments[0]!.kind !== "switch" ? "default" : "outline"}
              onClick={() => replaceSingleSegmentKind("if_else")}
            >
              If / else
            </Button>
            <Button
              type="button"
              size="sm"
              variant={segments[0]!.kind === "switch" ? "default" : "outline"}
              onClick={() => replaceSingleSegmentKind("switch")}
            >
              Switch
            </Button>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!br11Hint.canAddAction}
            title={
              !br11Hint.canAddAction
                ? "Would exceed automation graph size limits (BR-11)."
                : undefined
            }
            onClick={() => addSegment(defaultActionSegment())}
          >
            Add action
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!br11Hint.canAddIf}
            title={
              !br11Hint.canAddIf
                ? "Would exceed automation graph size limits (BR-11)."
                : undefined
            }
            onClick={() => addSegment(defaultIfElseSegment())}
          >
            Add if / else
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!br11Hint.canAddSwitch}
            title={
              !br11Hint.canAddSwitch
                ? "Would exceed automation graph size limits (BR-11)."
                : undefined
            }
            onClick={() => addSegment(defaultSwitchSegment())}
          >
            Add switch
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Using ~{br11Hint.footprint.nodeCount} nodes, ~
          {br11Hint.footprint.edgeCount} edges (caps 64 nodes / 128 edges).
        </p>
      </div>

      <div className="space-y-6 px-3 pb-2">
        {segments.map((seg, index) => (
          <div
            key={`seg-${index}-${seg.kind}`}
            className="space-y-3 rounded-md border bg-background p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {seg.kind === "action"
                  ? `Block ${index + 1} — Action`
                  : seg.kind === "if_else"
                    ? `Block ${index + 1} — If / else`
                    : `Block ${index + 1} — Switch`}
              </p>
              {segments.length > 1 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => removeSegment(index)}
                >
                  Remove block
                </Button>
              ) : null}
            </div>

            {seg.kind === "action" ? (
              <BranchActionBlock
                title="Then"
                step={seg.step}
                compatibleActionTypes={compatibleActionTypes}
                onChangeStep={(step) =>
                  updateSegment(index, { kind: "action", step })
                }
              />
            ) : null}

            {seg.kind === "if_else" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase text-muted-foreground">
                    When (conditions, all must pass)
                  </Label>
                  {seg.conditions.map((c: AutomationCondition, i: number) => (
                    <div
                      key={`${index}-${i}-${c.path}`}
                      className="grid gap-2 rounded-md border bg-muted/20 p-2 sm:grid-cols-3"
                    >
                      <Input
                        placeholder="Payload path"
                        value={c.path}
                        onChange={(e) => {
                          const conditions = [...seg.conditions];
                          conditions[i] = {
                            ...conditions[i]!,
                            path: e.target.value,
                          };
                          updateSegment(index, { ...seg, conditions });
                        }}
                      />
                      <Select
                        value={c.operator}
                        onValueChange={(op) => {
                          const conditions = [...seg.conditions];
                          conditions[i] = {
                            ...conditions[i]!,
                            operator: op as AutomationCondition["operator"],
                          };
                          updateSegment(index, { ...seg, conditions });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AUTOMATION_CONDITION_OPERATORS.map((op) => (
                            <SelectItem key={op} value={op}>
                              {op}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Value"
                        value={String(c.value ?? "")}
                        onChange={(e) => {
                          const raw = e.target.value;
                          let value: string | number = raw;
                          if (/^-?\d+(\.\d+)?$/.test(raw)) {
                            value = Number(raw);
                          }
                          const conditions = [...seg.conditions];
                          conditions[i] = { ...conditions[i]!, value };
                          updateSegment(index, { ...seg, conditions });
                        }}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      seg.conditions.length >= MAX_CONDITIONS_PER_IF_NODE
                    }
                    onClick={() =>
                      updateSegment(index, {
                        ...seg,
                        conditions: [...seg.conditions, defaultCondition()],
                      })
                    }
                  >
                    Add condition
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <BranchActionBlock
                    title="Then (true branch)"
                    step={seg.trueStep}
                    compatibleActionTypes={compatibleActionTypes}
                    onChangeStep={(trueStep) =>
                      updateSegment(index, { ...seg, trueStep })
                    }
                  />
                  <BranchActionBlock
                    title="Else (false branch)"
                    step={seg.falseStep}
                    compatibleActionTypes={compatibleActionTypes}
                    onChangeStep={(falseStep) =>
                      updateSegment(index, { ...seg, falseStep })
                    }
                  />
                </div>
              </div>
            ) : null}

            {seg.kind === "switch" ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor={`branch-switch-path-${index}`}>
                    Switch on (payload path)
                  </Label>
                  <Input
                    id={`branch-switch-path-${index}`}
                    placeholder="e.g. region"
                    value={seg.discriminantPath}
                    onChange={(e) =>
                      updateSegment(index, {
                        ...seg,
                        discriminantPath: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium uppercase text-muted-foreground">
                      Cases
                    </Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={seg.cases.length + 1 >= MAX_SWITCH_OUT_EDGES}
                      onClick={() => {
                        const nextCases = [
                          ...seg.cases,
                          {
                            edgeKey: `case${seg.cases.length + 1}`,
                            step: defaultNotificationStep(),
                          },
                        ];
                        updateSegment(index, { ...seg, cases: nextCases });
                      }}
                    >
                      Add case
                    </Button>
                  </div>
                  {seg.cases.map(
                    (
                      row: {
                        edgeKey: string;
                        step: LinearAutomationFlowStepInput;
                      },
                      i: number,
                    ) => (
                      <div
                        key={
                          seg.ids?.caseActionIds?.[i] ?? `case-${index}-${i}`
                        }
                        className="space-y-2 rounded-md border bg-muted/20 p-2"
                      >
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="min-w-[120px] flex-1 space-y-1">
                            <Label className="text-xs">Case key</Label>
                            <Input
                              value={row.edgeKey}
                              onChange={(e) => {
                                const cases = [...seg.cases];
                                cases[i] = {
                                  ...cases[i]!,
                                  edgeKey: e.target.value,
                                };
                                updateSegment(index, { ...seg, cases });
                              }}
                            />
                          </div>
                          {seg.cases.length > 1 ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => {
                                const cases = seg.cases.filter(
                                  (_row, j: number) => j !== i,
                                );
                                updateSegment(index, { ...seg, cases });
                              }}
                            >
                              Remove
                            </Button>
                          ) : null}
                        </div>
                        <BranchActionBlock
                          title="Then"
                          step={row.step}
                          compatibleActionTypes={compatibleActionTypes}
                          onChangeStep={(step) => {
                            const cases = [...seg.cases];
                            cases[i] = { ...cases[i]!, step };
                            updateSegment(index, { ...seg, cases });
                          }}
                        />
                      </div>
                    ),
                  )}
                </div>
                <BranchActionBlock
                  title="Default"
                  step={seg.defaultStep}
                  compatibleActionTypes={compatibleActionTypes}
                  onChangeStep={(defaultStep) =>
                    updateSegment(index, { ...seg, defaultStep })
                  }
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {showGraphPreview ? (
        <div className="border-t bg-muted/10 px-3 py-3">
          <p className="mb-2 text-xs font-medium text-foreground">
            Graph preview
          </p>
          <ReactFlowProvider>
            <AutomationFlowGraphPreview
              flowGraph={previewGraph}
              className="h-[220px] min-h-[200px] w-full rounded-md border bg-background"
              overlayHint={null}
            />
          </ReactFlowProvider>
        </div>
      ) : null}
    </div>
  );
}
