"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form } from "@/components/ui/form";
import {
  AUTOMATION_ACTION_TYPE_VALUES,
  isAutomationActionAllowedForEvent,
  EnvFeature,
} from "@repo/shared";
import {
  AutomationDefinitionFormSchema,
  hasPreservedBranchingFlowGraphShape,
  type AutomationDefinitionFormValues,
} from "../validation";
import { useEnvFeatureFlag } from "@/features/flags";
import { cn } from "@/lib/utils";
import { ReactFlowProvider } from "@xyflow/react";
import { getDefaultActionConfig } from "./automation-action-config-fields";
import {
  AutomationFlowCompileMetaProvider,
  type AutomationFlowCompileStableIds,
} from "./automation-flow-compile-meta-context";
import { AutomationFlowCanvas } from "./AutomationFlowCanvas";
import { AutomationFlowGraphPreview } from "./AutomationFlowGraphPreview";
import { AutomationMetadataSection } from "./AutomationMetadataSection";
import { AutomationTriggersSection } from "./AutomationTriggersSection";
import { AutomationStepsSection } from "./AutomationStepsSection";

interface AutomationFormProps {
  defaultValues?: AutomationDefinitionFormValues;
  onSubmit: (values: AutomationDefinitionFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  /**
   * When editing a graph-backed linear chain, reuse these node ids in the
   * "stored graph" preview (matches save payload from the builder).
   */
  linearFlowCompileStableIds?: AutomationFlowCompileStableIds | null;
}

function triggerUsesInventoryEvent(eventName: string): boolean {
  return eventName.startsWith("inventory.");
}

export function AutomationForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
  linearFlowCompileStableIds = null,
}: AutomationFormProps) {
  const initialValues = useMemo<AutomationDefinitionFormValues>(
    () =>
      defaultValues ?? {
        name: "",
        description: "",
        scopeType: "GLOBAL",
        scopeId: "",
        status: "ACTIVE",
        executionMode: "LIVE",
        suppressLegacyWorkflows: false,
        triggers: [
          {
            eventName: "inventory.stock.low_detected",
            conditions: [],
            delayMinutes: 0,
          },
        ],
        steps: [
          {
            actionType: "workitem.create",
            actionConfig: getDefaultActionConfig("workitem.create"),
            continueOnError: false,
          },
        ],
        branchingCanvasAuthoring: false,
      },
    [defaultValues],
  );

  const form = useForm<AutomationDefinitionFormValues>({
    resolver: zodResolver(AutomationDefinitionFormSchema),
    defaultValues: initialValues,
  });

  const { errors } = form.formState;

  // Derived state shared across sections
  const preservedBranchingFlowGraph = form.watch("preservedBranchingFlowGraph");
  const branchingCanvasAuthoring =
    form.watch("branchingCanvasAuthoring") ?? false;
  const branchingGraphLocked =
    hasPreservedBranchingFlowGraphShape(preservedBranchingFlowGraph) &&
    !branchingCanvasAuthoring;

  const selectedTriggerEvents = form.watch("triggers");
  const compatibleActionTypes = useMemo(() => {
    const events = selectedTriggerEvents.map((trigger) => trigger.eventName);
    return AUTOMATION_ACTION_TYPE_VALUES.filter((actionType) =>
      events.some((eventName) =>
        isAutomationActionAllowedForEvent(actionType, eventName),
      ),
    );
  }, [selectedTriggerEvents]);

  const hasInventoryTrigger = useMemo(
    () =>
      selectedTriggerEvents.some((t) => triggerUsesInventoryEvent(t.eventName)),
    [selectedTriggerEvents],
  );

  // Reset form when external defaultValues change identity
  const lastResetSnapshotRef = useRef<string | null>(null);
  useEffect(() => {
    const snap = JSON.stringify(initialValues);
    if (lastResetSnapshotRef.current === snap) {
      return;
    }
    lastResetSnapshotRef.current = snap;
    form.reset(initialValues);
  }, [form, initialValues]);

  const visualBuilderEnabled = useEnvFeatureFlag(
    EnvFeature.AUTOMATION_VISUAL_BUILDER,
  );
  const automationBranchingEnabled = useEnvFeatureFlag(
    EnvFeature.AUTOMATION_BRANCHING,
  );
  const [editorTab, setEditorTab] = useState<"flow" | "form">("form");
  const formSectionRef = useRef<HTMLDivElement>(null);
  const flowSectionRef = useRef<HTMLElement>(null);

  return (
    <AutomationFlowCompileMetaProvider value={linearFlowCompileStableIds}>
      <Form {...form}>
        <form
          className="space-y-5 rounded-lg border p-4"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          {/* Hidden controllers to register fields used only via setValue */}
          <Controller
            control={form.control}
            name="preservedBranchingFlowGraph"
            render={() => <span className="sr-only" aria-hidden />}
          />
          <Controller
            control={form.control}
            name="branchingCanvasAuthoring"
            render={() => <span className="sr-only" aria-hidden />}
          />

          {Object.keys(errors).length > 0 ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              Some fields need attention. Review the messages below and try
              again.
            </div>
          ) : null}

          {visualBuilderEnabled ? (
            <div className="flex flex-wrap gap-2 border-b pb-3">
              <Button
                type="button"
                size="sm"
                variant={editorTab === "form" ? "default" : "outline"}
                onClick={() => {
                  setEditorTab("form");
                  formSectionRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
                data-testid="automation-editor-tab-all-fields"
              >
                All fields
              </Button>
              <Button
                type="button"
                size="sm"
                variant={editorTab === "flow" ? "default" : "outline"}
                onClick={() => {
                  setEditorTab("flow");
                  flowSectionRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
                data-testid="automation-editor-tab-flow-chart"
              >
                Flow chart
              </Button>
            </div>
          ) : null}

          {visualBuilderEnabled && editorTab === "flow" ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Edit <strong className="font-medium text-foreground">name</strong>
              , <strong className="font-medium text-foreground">scope</strong>,
              and{" "}
              <strong className="font-medium text-foreground">triggers</strong>{" "}
              on the{" "}
              <strong className="font-medium text-foreground">
                All fields
              </strong>{" "}
              tab. On this chart, click a step to configure its action, or drag
              cards to reorder.
            </p>
          ) : null}

          {visualBuilderEnabled ? (
            <p className="border-b pb-3 text-xs leading-relaxed text-muted-foreground">
              The{" "}
              <strong className="font-medium text-foreground">
                All fields
              </strong>{" "}
              column and{" "}
              <strong className="font-medium text-foreground">
                Flow chart
              </strong>{" "}
              share the same automation
              {branchingCanvasAuthoring && automationBranchingEnabled
                ? "—edit conditional routing under All fields; the flow column shows a live preview."
                : "—edit triggers, steps, and branching in either place (shown side by side on wide screens)."}
            </p>
          ) : null}

          <div
            className={cn(
              visualBuilderEnabled &&
                "grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,1fr)] lg:items-start",
            )}
          >
            <div
              ref={formSectionRef}
              id="automation-form-fields"
              className={cn("space-y-5", visualBuilderEnabled && "min-w-0")}
            >
              <AutomationMetadataSection
                hasInventoryTrigger={hasInventoryTrigger}
              />
              <AutomationTriggersSection />
              <AutomationStepsSection
                compatibleActionTypes={compatibleActionTypes}
                branchingGraphLocked={branchingGraphLocked}
                branchingCanvasAuthoring={branchingCanvasAuthoring}
                visualBuilderEnabled={visualBuilderEnabled}
                automationBranchingEnabled={automationBranchingEnabled}
              />
            </div>

            {visualBuilderEnabled ? (
              <aside
                ref={flowSectionRef}
                id="automation-flow-section"
                aria-label="Flow chart"
                className="min-w-0 space-y-3 border-t border-border pt-5 lg:border-t-0 lg:border-l lg:border-border lg:pl-6 lg:pt-0"
              >
                <div>
                  <h2 className="text-base font-semibold tracking-tight">
                    Flow chart
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {branchingCanvasAuthoring && automationBranchingEnabled
                      ? "Live preview of the routing graph. Edit the timeline under All fields → Steps."
                      : "Same triggers and steps as the list on the left. Click a step node to edit its action here; reorder by dragging."}
                  </p>
                </div>
                {branchingGraphLocked ? (
                  <div className="space-y-3">
                    <Alert>
                      <AlertTitle>Branching graph (read-only)</AlertTitle>
                      <AlertDescription>
                        This automation uses conditional routing in its{" "}
                        <code className="text-xs">flowGraph</code>. You can edit
                        name, scope, triggers, and execution settings in{" "}
                        <strong>All fields</strong>. The graph shape is not
                        editable in the UI for this definition (imported or
                        non-template branching).
                      </AlertDescription>
                    </Alert>
                    <ReactFlowProvider>
                      <AutomationFlowGraphPreview
                        flowGraph={preservedBranchingFlowGraph}
                      />
                    </ReactFlowProvider>
                    {errors.preservedBranchingFlowGraph?.message ? (
                      <p
                        role="alert"
                        className="text-sm text-destructive"
                        id="automation-preserved-graph-error-aside"
                      >
                        {String(errors.preservedBranchingFlowGraph.message)}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <ReactFlowProvider>
                    <AutomationFlowCanvas />
                  </ReactFlowProvider>
                )}
              </aside>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save automation"}
            </Button>
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </Form>
    </AutomationFlowCompileMetaProvider>
  );
}
