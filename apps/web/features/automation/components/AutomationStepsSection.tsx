"use client";

import { useEffect } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HelpTopicSheet } from "@/components/help-topic-sheet";
import { Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AUTOMATION_ACTION_TYPE_DESCRIPTIONS,
  type AutomationActionTypeValue,
} from "@repo/shared";
import type { AutomationDefinitionFormValues } from "../validation";
import {
  ActionConfigFields,
  getDefaultActionConfig,
} from "./automation-action-config-fields";
import { AutomationBranchingAuthoringPanel } from "./AutomationBranchingAuthoringPanel";
import { exitBranchingToLinear } from "./automation-exit-branching";

const STEP_AUTO_ADJUST_NOTE =
  "When triggers change, any step whose action is not allowed for those events is reset to the first compatible action and default settings.";

interface AutomationStepsSectionProps {
  compatibleActionTypes: AutomationActionTypeValue[];
  branchingGraphLocked: boolean;
  branchingCanvasAuthoring: boolean;
  visualBuilderEnabled: boolean;
  automationBranchingEnabled: boolean;
}

export function AutomationStepsSection({
  compatibleActionTypes,
  branchingGraphLocked,
  branchingCanvasAuthoring,
  visualBuilderEnabled,
  automationBranchingEnabled,
}: AutomationStepsSectionProps) {
  const form = useFormContext<AutomationDefinitionFormValues>();
  const {
    formState: { errors },
  } = form;

  const stepArray = useFieldArray({
    control: form.control,
    name: "steps",
  });

  useEffect(() => {
    if (branchingGraphLocked) {
      return;
    }
    stepArray.fields.forEach((_, index) => {
      const actionType = form.getValues(`steps.${index}.actionType`);
      if (compatibleActionTypes.includes(actionType)) {
        return;
      }
      const fallbackActionType = compatibleActionTypes[0];
      if (!fallbackActionType) {
        return;
      }
      form.setValue(`steps.${index}.actionType`, fallbackActionType, {
        shouldValidate: true,
      });
      form.setValue(
        `steps.${index}.actionConfig`,
        getDefaultActionConfig(fallbackActionType),
        { shouldValidate: true },
      );
    });
  }, [branchingGraphLocked, compatibleActionTypes, form, stepArray.fields]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Label>Steps</Label>
          <HelpTopicSheet topicLabel="Automation steps" sheetTitle="Steps">
            <p>{STEP_AUTO_ADJUST_NOTE}</p>
          </HelpTopicSheet>
        </div>
        {!branchingGraphLocked && !branchingCanvasAuthoring ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              stepArray.append({
                actionType: "notification.send",
                actionConfig: getDefaultActionConfig("notification.send"),
                continueOnError: false,
              })
            }
          >
            Add step
          </Button>
        ) : null}
      </div>
      {branchingGraphLocked ? (
        <div className="space-y-2">
          {!visualBuilderEnabled ? (
            <Alert>
              <AlertTitle>Branching graph (read-only)</AlertTitle>
              <AlertDescription>
                This automation uses a saved{" "}
                <code className="text-xs">flowGraph</code>. Enable the visual
                builder to see a read-only diagram in{" "}
                <strong>Flow chart</strong>, or edit metadata and triggers here;
                graph shape is not editable in the UI for this definition.
              </AlertDescription>
            </Alert>
          ) : null}
          {errors.preservedBranchingFlowGraph?.message ? (
            <p role="alert" className="text-sm text-destructive">
              {String(errors.preservedBranchingFlowGraph.message)}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Actions live inside the branching graph (not in a linear step list).
            Use the flow chart for a diagram; name, scope, triggers, and
            execution settings stay editable here.
          </p>
        </div>
      ) : null}
      {automationBranchingEnabled &&
      branchingCanvasAuthoring &&
      !branchingGraphLocked ? (
        <div
          className="space-y-3 rounded-md border border-dashed border-primary/25 bg-muted/10 p-3"
          data-testid="automation-branching-authoring"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              Conditional routing
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => exitBranchingToLinear(form, compatibleActionTypes)}
            >
              Back to linear steps
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            One shared graph drives this form and the flow chart.
            {visualBuilderEnabled
              ? " The chart column shows a preview while you edit here."
              : null}
          </p>
          <AutomationBranchingAuthoringPanel
            compatibleActionTypes={compatibleActionTypes}
            showGraphPreview={!visualBuilderEnabled}
          />
        </div>
      ) : null}
      {!branchingGraphLocked &&
        !branchingCanvasAuthoring &&
        stepArray.fields.map((field, index) => {
          const actionType = form.watch(`steps.${index}.actionType`);
          const config =
            (form.watch(`steps.${index}.actionConfig`) as Record<
              string,
              unknown
            >) ?? {};

          return (
            <div key={field.id} className="space-y-3 rounded-md border p-3">
              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
                <Select
                  value={actionType}
                  onValueChange={(next) => {
                    const typed = next as AutomationActionTypeValue;
                    form.setValue(`steps.${index}.actionType`, typed);
                    form.setValue(
                      `steps.${index}.actionConfig`,
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
                    checked={form.watch(`steps.${index}.continueOnError`)}
                    onCheckedChange={(checked) =>
                      form.setValue(`steps.${index}.continueOnError`, checked)
                    }
                  />
                  <Label>Continue on error</Label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove step ${index + 1}`}
                  onClick={() => stepArray.remove(index)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              {errors.steps?.[index]?.actionType?.message ? (
                <p role="alert" className="text-xs text-destructive">
                  {errors.steps[index]?.actionType?.message}
                </p>
              ) : null}
              <ActionConfigFields
                actionType={actionType}
                value={config}
                onChange={(next) =>
                  form.setValue(`steps.${index}.actionConfig`, next, {
                    shouldValidate: true,
                  })
                }
              />
              {errors.steps?.[index]?.actionConfig &&
              typeof errors.steps[index]?.actionConfig === "object" &&
              "message" in (errors.steps[index]?.actionConfig as object) ? (
                <p role="alert" className="text-xs text-destructive">
                  {String(
                    (
                      errors.steps[index]?.actionConfig as {
                        message?: string;
                      }
                    ).message,
                  )}
                </p>
              ) : null}
            </div>
          );
        })}
    </div>
  );
}
