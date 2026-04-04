"use client";

import { useEffect, useState } from "react";
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
  compileIfElseFlowGraph,
  compileSwitchFlowGraph,
  tryExtractIfElseAuthoringFromGraph,
  tryExtractSwitchAuthoringFromGraph,
  type AutomationActionTypeValue,
  type AutomationCondition,
  type IfElseAuthoringExtract,
  type LinearAutomationFlowStepInput,
  type SwitchAuthoringExtract,
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

function buildInitialIfExtract(graph: unknown): IfElseAuthoringExtract {
  const ex = tryExtractIfElseAuthoringFromGraph(graph);
  if (ex) return ex;
  const g = compileIfElseFlowGraph({
    conditions: [defaultCondition()],
    trueStep: defaultNotificationStep(),
    falseStep: defaultNotificationStep(),
  });
  return tryExtractIfElseAuthoringFromGraph(g)!;
}

function buildInitialSwitchExtract(graph: unknown): SwitchAuthoringExtract {
  const ex = tryExtractSwitchAuthoringFromGraph(graph);
  if (ex) return ex;
  const g = compileSwitchFlowGraph({
    discriminantPath: "region",
    cases: [
      {
        edgeKey: "east",
        step: defaultNotificationStep(),
      },
    ],
    defaultStep: defaultNotificationStep(),
  });
  return tryExtractSwitchAuthoringFromGraph(g)!;
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
}

export function AutomationBranchingAuthoringPanel({
  compatibleActionTypes,
}: AutomationBranchingAuthoringPanelProps): React.ReactElement {
  const form = useFormContext<AutomationDefinitionFormValues>();
  const preserved = useWatch({
    control: form.control,
    name: "preservedBranchingFlowGraph",
  });

  const [kind, setKind] = useState<"if_else" | "switch">(() =>
    tryExtractSwitchAuthoringFromGraph(preserved) ? "switch" : "if_else",
  );

  const [ifExtract, setIfExtract] = useState<IfElseAuthoringExtract>(() =>
    buildInitialIfExtract(preserved),
  );

  const [switchExtract, setSwitchExtract] = useState<SwitchAuthoringExtract>(
    () => buildInitialSwitchExtract(preserved),
  );

  useEffect(() => {
    const nextGraph =
      kind === "if_else"
        ? compileIfElseFlowGraph(
            {
              conditions: ifExtract.conditions,
              trueStep: ifExtract.trueStep,
              falseStep: ifExtract.falseStep,
            },
            ifExtract.ids,
          )
        : compileSwitchFlowGraph(
            {
              discriminantPath: switchExtract.discriminantPath,
              cases: switchExtract.cases,
              defaultStep: switchExtract.defaultStep,
            },
            switchExtract.ids,
          );
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
  }, [kind, ifExtract, switchExtract, form]);

  const previewGraph = useWatch({
    control: form.control,
    name: "preservedBranchingFlowGraph",
  });

  const updateCondition = (
    index: number,
    patch: Partial<AutomationCondition>,
  ) => {
    setIfExtract((prev: IfElseAuthoringExtract) => {
      const conditions = [...prev.conditions];
      conditions[index] = { ...conditions[index]!, ...patch };
      return { ...prev, conditions };
    });
  };

  return (
    <div className="flex min-h-[440px] flex-col gap-4 rounded-lg border bg-muted/20">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <span className="text-sm font-medium text-foreground">Branch type</span>
        <Button
          type="button"
          size="sm"
          variant={kind === "if_else" ? "default" : "outline"}
          onClick={() => {
            setKind("if_else");
            setIfExtract(
              buildInitialIfExtract(
                form.getValues("preservedBranchingFlowGraph"),
              ),
            );
          }}
        >
          If / else
        </Button>
        <Button
          type="button"
          size="sm"
          variant={kind === "switch" ? "default" : "outline"}
          onClick={() => {
            setKind("switch");
            setSwitchExtract(
              buildInitialSwitchExtract(
                form.getValues("preservedBranchingFlowGraph"),
              ),
            );
          }}
        >
          Switch
        </Button>
      </div>

      <div className="px-3 pb-2">
        {kind === "if_else" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase text-muted-foreground">
                Condition
              </Label>
              {ifExtract.conditions.map((c: AutomationCondition, i: number) => (
                <div
                  key={`${i}-${c.path}`}
                  className="grid gap-2 rounded-md border bg-background p-2 sm:grid-cols-3"
                >
                  <Input
                    placeholder="Payload path"
                    value={c.path}
                    onChange={(e) =>
                      updateCondition(i, { path: e.target.value })
                    }
                  />
                  <Select
                    value={c.operator}
                    onValueChange={(op) =>
                      updateCondition(i, {
                        operator: op as AutomationCondition["operator"],
                      })
                    }
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
                      updateCondition(i, { value });
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <BranchActionBlock
                title="When true"
                step={ifExtract.trueStep}
                compatibleActionTypes={compatibleActionTypes}
                onChangeStep={(trueStep) =>
                  setIfExtract((p: IfElseAuthoringExtract) => ({
                    ...p,
                    trueStep,
                  }))
                }
              />
              <BranchActionBlock
                title="When false"
                step={ifExtract.falseStep}
                compatibleActionTypes={compatibleActionTypes}
                onChangeStep={(falseStep) =>
                  setIfExtract((p: IfElseAuthoringExtract) => ({
                    ...p,
                    falseStep,
                  }))
                }
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="branch-switch-path">Discriminant path</Label>
              <Input
                id="branch-switch-path"
                placeholder="e.g. region"
                value={switchExtract.discriminantPath}
                onChange={(e) =>
                  setSwitchExtract((p: SwitchAuthoringExtract) => ({
                    ...p,
                    discriminantPath: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium uppercase text-muted-foreground">
                  Cases (edge keys)
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setSwitchExtract((p: SwitchAuthoringExtract) => {
                      const nextCases = [
                        ...p.cases,
                        {
                          edgeKey: `case${p.cases.length + 1}`,
                          step: defaultNotificationStep(),
                        },
                      ];
                      const g = compileSwitchFlowGraph(
                        {
                          discriminantPath: p.discriminantPath,
                          cases: nextCases,
                          defaultStep: p.defaultStep,
                        },
                        p.ids,
                      );
                      return tryExtractSwitchAuthoringFromGraph(g)!;
                    })
                  }
                >
                  Add case
                </Button>
              </div>
              {switchExtract.cases.map(
                (row: SwitchAuthoringExtract["cases"][number], i: number) => (
                  <div
                    key={switchExtract.ids.caseActionIds[i] ?? `case-${i}`}
                    className="space-y-2 rounded-md border bg-background p-2"
                  >
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="min-w-[120px] flex-1 space-y-1">
                        <Label className="text-xs">Edge key</Label>
                        <Input
                          value={row.edgeKey}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSwitchExtract((p: SwitchAuthoringExtract) => {
                              const cases = [...p.cases];
                              cases[i] = { ...cases[i]!, edgeKey: v };
                              return { ...p, cases };
                            });
                          }}
                        />
                      </div>
                      {switchExtract.cases.length > 1 ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() =>
                            setSwitchExtract((p: SwitchAuthoringExtract) => {
                              const cases = p.cases.filter(
                                (_row, j: number) => j !== i,
                              );
                              const g = compileSwitchFlowGraph(
                                {
                                  discriminantPath: p.discriminantPath,
                                  cases,
                                  defaultStep: p.defaultStep,
                                },
                                p.ids,
                              );
                              return tryExtractSwitchAuthoringFromGraph(g)!;
                            })
                          }
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                    <BranchActionBlock
                      title="Action"
                      step={row.step}
                      compatibleActionTypes={compatibleActionTypes}
                      onChangeStep={(step) =>
                        setSwitchExtract((p: SwitchAuthoringExtract) => {
                          const cases = [...p.cases];
                          cases[i] = { ...cases[i]!, step };
                          return { ...p, cases };
                        })
                      }
                    />
                  </div>
                ),
              )}
            </div>
            <BranchActionBlock
              title="Default branch"
              step={switchExtract.defaultStep}
              compatibleActionTypes={compatibleActionTypes}
              onChangeStep={(defaultStep) =>
                setSwitchExtract((p: SwitchAuthoringExtract) => ({
                  ...p,
                  defaultStep,
                }))
              }
            />
          </div>
        )}
      </div>

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
    </div>
  );
}
