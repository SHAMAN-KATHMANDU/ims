"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { HelpTopicSheet } from "@/components/help-topic-sheet";
import { Package, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { usePipelines } from "@/features/crm";
import { useActiveLocations } from "@/features/locations";
import {
  AUTOMATION_ACTION_TYPE_DESCRIPTIONS,
  AUTOMATION_ACTION_TYPE_VALUES,
  AUTOMATION_CONDITION_OPERATOR_META,
  AUTOMATION_CONDITION_OPERATORS,
  AUTOMATION_EXECUTION_MODE_LABELS,
  AUTOMATION_EXECUTION_MODE_VALUES,
  AUTOMATION_SCOPE_VALUES,
  AUTOMATION_STATUS_LABELS,
  AUTOMATION_STATUS_VALUES,
  AUTOMATION_TRIGGER_EVENT_CATALOG,
  AUTOMATION_EVENT_GROUP_ORDER,
  getAutomationTriggerEventsByGroup,
  isAutomationActionAllowedForEvent,
  type AutomationActionTypeValue,
  type AutomationCondition,
} from "@repo/shared";
import {
  AutomationDefinitionFormSchema,
  hasPreservedBranchingFlowGraphShape,
  type AutomationDefinitionFormValues,
} from "../validation";
import { useEnvFeatureFlag } from "@/features/flags";
import { EnvFeature } from "@repo/shared";
import { cn } from "@/lib/utils";
import { ReactFlowProvider } from "@xyflow/react";
import {
  ActionConfigFields,
  getDefaultActionConfig,
} from "./automation-action-config-fields";
import {
  AutomationFlowCompileMetaProvider,
  type AutomationFlowCompileStableIds,
} from "./automation-flow-compile-meta-context";
import { AutomationFlowCanvas } from "./AutomationFlowCanvas";
import { AutomationFlowGraphPreview } from "./AutomationFlowGraphPreview";

interface AutomationFormProps {
  defaultValues?: AutomationDefinitionFormValues;
  onSubmit: (values: AutomationDefinitionFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  /**
   * When editing a graph-backed linear chain, reuse these node ids in the
   * “stored graph” preview (matches save payload from the builder).
   */
  linearFlowCompileStableIds?: AutomationFlowCompileStableIds | null;
}

const AUTOMATION_EVENT_GROUP_LABELS: Record<
  (typeof AUTOMATION_EVENT_GROUP_ORDER)[number],
  string
> = {
  CRM: "CRM",
  SALES: "Sales",
  INVENTORY: "Inventory",
  TRANSFERS: "Transfers",
  CATALOG: "Catalog",
  MEMBERS: "Members",
  WORK_ITEMS: "Work items",
  VENDORS: "Vendors",
  LOCATIONS: "Locations",
};

const SCOPE_LABELS = {
  GLOBAL: "Global",
  CRM_PIPELINE: "CRM pipeline",
  LOCATION: "Location",
  PRODUCT_VARIATION: "Product variation",
} as const;

function triggerUsesInventoryEvent(eventName: string): boolean {
  return eventName.startsWith("inventory.");
}

function getDefaultCondition(): AutomationCondition {
  return {
    path: "total",
    operator: "gte",
    value: 1000,
  };
}

function formatConditionValueForDisplay(
  operator: AutomationCondition["operator"],
  value: unknown,
): string {
  if (value == null) return "";
  if (operator === "in" && Array.isArray(value)) {
    return value.map((v) => String(v)).join(", ");
  }
  return String(value);
}

const NUMERIC_OPERATORS = new Set<AutomationCondition["operator"]>([
  "gt",
  "gte",
  "lt",
  "lte",
]);

function getScopeIdPlaceholder(
  scopeType: AutomationDefinitionFormValues["scopeType"],
): string {
  switch (scopeType) {
    case "CRM_PIPELINE":
      return "Select a CRM pipeline";
    case "LOCATION":
      return "Select a location";
    case "PRODUCT_VARIATION":
      return "Enter a product variation UUID";
    default:
      return "No scope id required";
  }
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
  const scopeType = form.watch("scopeType");
  const { data: pipelineData } = usePipelines(
    { page: 1, limit: 100 },
    { enabled: scopeType === "CRM_PIPELINE" },
  );
  const { data: locationData } = useActiveLocations();

  const triggerArray = useFieldArray({
    control: form.control,
    name: "triggers",
  });
  const stepArray = useFieldArray({
    control: form.control,
    name: "steps",
  });
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

  const triggerEventsByGroup = useMemo(
    () => getAutomationTriggerEventsByGroup(),
    [],
  );

  const hasInventoryTrigger = useMemo(
    () =>
      selectedTriggerEvents.some((t) => triggerUsesInventoryEvent(t.eventName)),
    [selectedTriggerEvents],
  );

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

  useEffect(() => {
    form.reset(initialValues);
  }, [form, initialValues]);

  const stepAutoAdjustNote =
    "When triggers change, any step whose action is not allowed for those events is reset to the first compatible action and default settings.";

  useEffect(() => {
    if (scopeType === "GLOBAL" && form.getValues("scopeId")) {
      form.setValue("scopeId", "", { shouldValidate: true });
    }
  }, [form, scopeType]);

  const visualBuilderEnabled = useEnvFeatureFlag(
    EnvFeature.AUTOMATION_VISUAL_BUILDER,
  );
  const [editorTab, setEditorTab] = useState<"flow" | "form">("flow");

  return (
    <AutomationFlowCompileMetaProvider value={linearFlowCompileStableIds}>
      <Form {...form}>
        <form
          className="space-y-5 rounded-lg border p-4"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
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
                variant={editorTab === "flow" ? "default" : "outline"}
                onClick={() => setEditorTab("flow")}
              >
                Flow chart
              </Button>
              <Button
                type="button"
                size="sm"
                variant={editorTab === "form" ? "default" : "outline"}
                onClick={() => setEditorTab("form")}
              >
                All fields
              </Button>
            </div>
          ) : null}

          {visualBuilderEnabled ? (
            <div className={cn(editorTab !== "flow" && "hidden")}>
              {branchingGraphLocked ? (
                <div className="space-y-3">
                  <Alert>
                    <AlertTitle>Branching graph (read-only)</AlertTitle>
                    <AlertDescription>
                      This automation uses conditional routing in its{" "}
                      <code className="text-xs">flowGraph</code>. You can edit
                      name, scope, triggers, and execution settings here. The
                      graph shape is not editable in the UI for this definition
                      (imported or non-template branching).
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
                      id="automation-preserved-graph-error"
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
            </div>
          ) : null}

          <div
            className={cn(
              "space-y-5",
              visualBuilderEnabled && editorTab !== "form" && "hidden",
            )}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="automation-scope-type">Scope</Label>
                  <HelpTopicSheet
                    topicLabel="Scope"
                    sheetTitle="Automation scope"
                  >
                    <p>
                      Global runs tenant-wide. CRM pipeline, location, or
                      product variation limits events to that target—choose the
                      matching scope target below when required.
                    </p>
                  </HelpTopicSheet>
                </div>
                <Select
                  value={scopeType}
                  onValueChange={(next) =>
                    form.setValue(
                      "scopeType",
                      next as AutomationDefinitionFormValues["scopeType"],
                    )
                  }
                >
                  <SelectTrigger id="automation-scope-type">
                    <SelectValue placeholder="Select scope" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTOMATION_SCOPE_VALUES.map((scope) => (
                      <SelectItem key={scope} value={scope}>
                        {SCOPE_LABELS[scope]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="automation-scope-target">Scope target</Label>
                  <HelpTopicSheet
                    topicLabel="Scope target"
                    sheetTitle="Scope target"
                  >
                    <p>
                      Required for CRM pipeline, location, or product variation
                      scopes. Global scope ignores this field.
                    </p>
                    {hasInventoryTrigger ? (
                      <p>
                        <strong>Inventory events</strong> (stock adjustments,
                        low stock, thresholds) are emitted per{" "}
                        <strong>warehouse</strong>—set scope to{" "}
                        <strong>Location</strong> and pick one site below for a
                        focused setup, or stay on <strong>Global</strong> to
                        react when any location reports low stock.
                      </p>
                    ) : null}
                  </HelpTopicSheet>
                </div>
                {scopeType === "CRM_PIPELINE" ? (
                  <Select
                    value={form.watch("scopeId") || ""}
                    onValueChange={(next) => form.setValue("scopeId", next)}
                  >
                    <SelectTrigger id="automation-scope-target">
                      <SelectValue
                        placeholder={getScopeIdPlaceholder(scopeType)}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(pipelineData?.pipelines ?? []).map((pipeline) => (
                        <SelectItem key={pipeline.id} value={pipeline.id}>
                          {pipeline.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
                {scopeType === "LOCATION" ? (
                  <Select
                    value={form.watch("scopeId") || ""}
                    onValueChange={(next) => form.setValue("scopeId", next)}
                  >
                    <SelectTrigger id="automation-scope-target">
                      <SelectValue
                        placeholder={getScopeIdPlaceholder(scopeType)}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(locationData ?? []).map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
                {scopeType === "PRODUCT_VARIATION" ? (
                  <Input
                    id="automation-scope-target"
                    placeholder={getScopeIdPlaceholder(scopeType)}
                    aria-invalid={!!errors.scopeId}
                    aria-describedby={
                      errors.scopeId
                        ? "automation-scope-target-error"
                        : undefined
                    }
                    {...form.register("scopeId")}
                  />
                ) : null}
                {scopeType === "GLOBAL" ? (
                  <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                    This automation applies across the tenant.
                  </div>
                ) : null}
                {errors.scopeId?.message ? (
                  <p
                    id="automation-scope-target-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {errors.scopeId.message}
                  </p>
                ) : null}
              </div>
              {hasInventoryTrigger ? (
                <Alert className="border-primary/20 bg-primary/5 md:col-span-2">
                  <Package className="text-primary" aria-hidden />
                  <AlertTitle>Inventory events</AlertTitle>
                  <AlertDescription className="text-muted-foreground">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <p className="text-sm">
                        Low-stock and threshold signals are emitted per
                        warehouse. Use <strong>Location</strong> scope for one
                        site or <strong>Global</strong> for all sites.
                      </p>
                      <HelpTopicSheet
                        topicLabel="Inventory scope setup"
                        sheetTitle="Low stock and inventory scope"
                      >
                        <ol className="list-decimal space-y-2 pl-5">
                          <li>
                            Choose <strong>Location</strong> under Scope, then
                            select a warehouse in <strong>Scope target</strong>
                            —this automation runs only when that site reports
                            low stock or threshold events.
                          </li>
                          <li>
                            Or keep <strong>Global</strong> to use the same
                            steps for <strong>every</strong> warehouse (still
                            one automation definition).
                          </li>
                          <li>
                            After saving, use <strong>SHADOW</strong> mode and
                            trigger a low-stock scenario in test data; check{" "}
                            <strong>Recent runs</strong> on the Event
                            automations page.
                          </li>
                        </ol>
                        <div className="flex flex-wrap gap-2 pt-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              form.setValue("scopeType", "LOCATION", {
                                shouldValidate: true,
                              });
                            }}
                          >
                            Set scope to Location
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              form.setValue("scopeType", "GLOBAL", {
                                shouldValidate: true,
                              });
                              form.setValue("scopeId", "", {
                                shouldValidate: true,
                              });
                            }}
                          >
                            Use Global (all warehouses)
                          </Button>
                        </div>
                      </HelpTopicSheet>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="automation-status">Status</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(next) =>
                    form.setValue(
                      "status",
                      next as AutomationDefinitionFormValues["status"],
                    )
                  }
                >
                  <SelectTrigger id="automation-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTOMATION_STATUS_VALUES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {AUTOMATION_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="automation-execution-mode">
                    Execution mode
                  </Label>
                  <HelpTopicSheet
                    topicLabel="Execution mode"
                    sheetTitle="Execution mode"
                  >
                    <p>
                      <strong>{AUTOMATION_EXECUTION_MODE_LABELS.LIVE}</strong>{" "}
                      performs real actions.{" "}
                      <strong>{AUTOMATION_EXECUTION_MODE_LABELS.SHADOW}</strong>{" "}
                      simulates steps and records previews in run history
                      without changing data—use while testing, then switch to{" "}
                      {AUTOMATION_EXECUTION_MODE_LABELS.LIVE}.
                    </p>
                  </HelpTopicSheet>
                </div>
                <Select
                  value={form.watch("executionMode")}
                  onValueChange={(next) =>
                    form.setValue(
                      "executionMode",
                      next as AutomationDefinitionFormValues["executionMode"],
                    )
                  }
                >
                  <SelectTrigger id="automation-execution-mode">
                    <SelectValue placeholder="Select execution mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTOMATION_EXECUTION_MODE_VALUES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {AUTOMATION_EXECUTION_MODE_LABELS[mode]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 rounded-md border p-3 md:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-1">
                    <Label className="leading-normal">
                      Suppress legacy CRM workflows
                    </Label>
                    <HelpTopicSheet
                      topicLabel="Suppress legacy CRM workflows"
                      sheetTitle="Suppress legacy CRM workflows"
                    >
                      <p>
                        When enabled, matching rules from{" "}
                        <strong>Settings → Deal pipeline rules</strong> are
                        skipped for the same deal events so you do not
                        double-create tasks or notifications while both systems
                        are in use.
                      </p>
                    </HelpTopicSheet>
                  </div>
                  <Switch
                    checked={form.watch("suppressLegacyWorkflows")}
                    onCheckedChange={(checked) =>
                      form.setValue("suppressLegacyWorkflows", checked)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Label>Triggers</Label>
                  <HelpTopicSheet
                    topicLabel="Triggers and conditions"
                    sheetTitle="Triggers and conditions"
                  >
                    <p>
                      Optional conditions use a path into the event payload (for
                      example{" "}
                      <code className="rounded bg-muted px-1">total</code> or{" "}
                      <code className="rounded bg-muted px-1">
                        payload.amount
                      </code>
                      ), an operator, and a value. Use <strong>Exists</strong>{" "}
                      to require a field without comparing its value.
                    </p>
                  </HelpTopicSheet>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    triggerArray.append({
                      eventName: "sales.sale.created",
                      conditions: [],
                      delayMinutes: 0,
                    })
                  }
                >
                  Add trigger
                </Button>
              </div>
              {triggerArray.fields.map((field, index) => (
                <div key={field.id} className="space-y-3 rounded-md border p-3">
                  <div className="grid gap-2 md:grid-cols-[1fr_140px_auto]">
                    <Select
                      value={form.watch(`triggers.${index}.eventName`)}
                      onValueChange={(next) =>
                        form.setValue(
                          `triggers.${index}.eventName`,
                          next as AutomationDefinitionFormValues["triggers"][number]["eventName"],
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Event" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[min(24rem,var(--radix-select-content-available-height))]">
                        {AUTOMATION_EVENT_GROUP_ORDER.map((group) => {
                          const events = triggerEventsByGroup[group];
                          if (!events?.length) return null;
                          return (
                            <SelectGroup key={group}>
                              <SelectLabel>
                                {AUTOMATION_EVENT_GROUP_LABELS[group]}
                              </SelectLabel>
                              {events.map((eventName) => {
                                const meta =
                                  AUTOMATION_TRIGGER_EVENT_CATALOG[eventName];
                                const label = meta?.label ?? eventName;
                                const description =
                                  meta?.description ??
                                  "No description available.";
                                return (
                                  <SelectItem
                                    key={eventName}
                                    value={eventName}
                                    textValue={`${label} ${eventName}`}
                                  >
                                    <span className="flex flex-col items-start gap-0.5 py-0.5 text-left">
                                      <span>{label}</span>
                                      <span className="text-xs font-normal text-muted-foreground">
                                        {description}
                                      </span>
                                    </span>
                                  </SelectItem>
                                );
                              })}
                            </SelectGroup>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      {...form.register(`triggers.${index}.delayMinutes`, {
                        valueAsNumber: true,
                      })}
                      placeholder="Delay min"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove trigger ${index + 1}`}
                      onClick={() => triggerArray.remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">
                        Conditions
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const current =
                            form.getValues(`triggers.${index}.conditions`) ??
                            [];
                          form.setValue(`triggers.${index}.conditions`, [
                            ...current,
                            getDefaultCondition(),
                          ]);
                        }}
                      >
                        Add condition
                      </Button>
                    </div>
                    {(form.watch(`triggers.${index}.conditions`) ?? []).map(
                      (condition, conditionIndex) => {
                        const conditionFieldErrors =
                          errors.triggers?.[index]?.conditions?.[
                            conditionIndex
                          ];
                        return (
                          <div
                            key={`${field.id}-condition-${conditionIndex}`}
                            className="space-y-1"
                          >
                            <div className="grid gap-2 md:grid-cols-[1.2fr_160px_1fr_auto]">
                              <Input
                                placeholder="Payload path"
                                aria-label={`Trigger ${index + 1} condition ${conditionIndex + 1} path`}
                                value={String(condition.path ?? "")}
                                onChange={(e) =>
                                  form.setValue(
                                    `triggers.${index}.conditions.${conditionIndex}.path`,
                                    e.target.value,
                                    { shouldValidate: true },
                                  )
                                }
                              />
                              <Select
                                value={condition.operator}
                                onValueChange={(next) => {
                                  const op =
                                    next as AutomationCondition["operator"];
                                  form.setValue(
                                    `triggers.${index}.conditions.${conditionIndex}.operator`,
                                    op,
                                    { shouldValidate: false },
                                  );
                                  if (op === "exists") {
                                    form.setValue(
                                      `triggers.${index}.conditions.${conditionIndex}.value`,
                                      undefined,
                                      { shouldValidate: true },
                                    );
                                  } else if (op === "in") {
                                    const v = form.getValues(
                                      `triggers.${index}.conditions.${conditionIndex}.value`,
                                    );
                                    if (Array.isArray(v)) {
                                      form.setValue(
                                        `triggers.${index}.conditions.${conditionIndex}.value`,
                                        v.map(String).join(", "),
                                        { shouldValidate: true },
                                      );
                                    } else if (typeof v !== "string") {
                                      form.setValue(
                                        `triggers.${index}.conditions.${conditionIndex}.value`,
                                        "",
                                        { shouldValidate: true },
                                      );
                                    }
                                  } else if (NUMERIC_OPERATORS.has(op)) {
                                    const v = form.getValues(
                                      `triggers.${index}.conditions.${conditionIndex}.value`,
                                    );
                                    const n = Number(v);
                                    form.setValue(
                                      `triggers.${index}.conditions.${conditionIndex}.value`,
                                      Number.isFinite(n) ? n : 0,
                                      { shouldValidate: true },
                                    );
                                  }
                                }}
                              >
                                <SelectTrigger
                                  aria-label={`Trigger ${index + 1} condition ${conditionIndex + 1} operator`}
                                >
                                  <SelectValue placeholder="Operator" />
                                </SelectTrigger>
                                <SelectContent>
                                  {AUTOMATION_CONDITION_OPERATORS.map(
                                    (operator) => {
                                      const opMeta =
                                        AUTOMATION_CONDITION_OPERATOR_META[
                                          operator
                                        ];
                                      return (
                                        <SelectItem
                                          key={operator}
                                          value={operator}
                                          textValue={opMeta.label}
                                        >
                                          <span className="flex flex-col items-start gap-0.5 py-0.5 text-left">
                                            <span>{opMeta.label}</span>
                                            <span className="text-xs font-normal text-muted-foreground">
                                              {opMeta.description}
                                            </span>
                                          </span>
                                        </SelectItem>
                                      );
                                    },
                                  )}
                                </SelectContent>
                              </Select>
                              {condition.operator === "exists" ? (
                                <span className="self-center px-1 text-sm text-muted-foreground">
                                  No value
                                </span>
                              ) : null}
                              {condition.operator === "in" ? (
                                <Textarea
                                  rows={2}
                                  placeholder='e.g. ["A","B"] or A, B'
                                  aria-label={`Trigger ${index + 1} condition ${conditionIndex + 1} value`}
                                  value={formatConditionValueForDisplay(
                                    condition.operator,
                                    condition.value,
                                  )}
                                  onChange={(e) =>
                                    form.setValue(
                                      `triggers.${index}.conditions.${conditionIndex}.value`,
                                      e.target.value,
                                      { shouldValidate: true },
                                    )
                                  }
                                />
                              ) : null}
                              {NUMERIC_OPERATORS.has(condition.operator) ? (
                                <Input
                                  type="number"
                                  aria-label={`Trigger ${index + 1} condition ${conditionIndex + 1} numeric value`}
                                  value={
                                    condition.value === "" ||
                                    condition.value === undefined ||
                                    condition.value === null
                                      ? ""
                                      : String(condition.value)
                                  }
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    form.setValue(
                                      `triggers.${index}.conditions.${conditionIndex}.value`,
                                      raw === "" ? "" : Number(raw),
                                      { shouldValidate: true },
                                    );
                                  }}
                                />
                              ) : null}
                              {condition.operator !== "exists" &&
                              condition.operator !== "in" &&
                              !NUMERIC_OPERATORS.has(condition.operator) ? (
                                <Input
                                  placeholder="Value"
                                  aria-label={`Trigger ${index + 1} condition ${conditionIndex + 1} value`}
                                  value={
                                    condition.value == null
                                      ? ""
                                      : String(condition.value)
                                  }
                                  onChange={(e) =>
                                    form.setValue(
                                      `triggers.${index}.conditions.${conditionIndex}.value`,
                                      e.target.value,
                                      { shouldValidate: true },
                                    )
                                  }
                                />
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Remove condition ${conditionIndex + 1} on trigger ${index + 1}`}
                                onClick={() => {
                                  const current =
                                    form.getValues(
                                      `triggers.${index}.conditions`,
                                    ) ?? [];
                                  form.setValue(
                                    `triggers.${index}.conditions`,
                                    current.filter(
                                      (_, i) => i !== conditionIndex,
                                    ),
                                  );
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            {conditionFieldErrors?.path?.message ? (
                              <p
                                role="alert"
                                className="text-xs text-destructive"
                              >
                                {conditionFieldErrors.path.message}
                              </p>
                            ) : null}
                            {conditionFieldErrors?.value?.message ? (
                              <p
                                role="alert"
                                className="text-xs text-destructive"
                              >
                                {String(conditionFieldErrors.value.message)}
                              </p>
                            ) : null}
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Label>Steps</Label>
                  <HelpTopicSheet
                    topicLabel="Automation steps"
                    sheetTitle="Steps"
                  >
                    <p>{stepAutoAdjustNote}</p>
                  </HelpTopicSheet>
                </div>
                {!branchingGraphLocked ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      stepArray.append({
                        actionType: "notification.send",
                        actionConfig:
                          getDefaultActionConfig("notification.send"),
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
                      <AlertTitle>Branching graph</AlertTitle>
                      <AlertDescription>
                        Open the <strong>Flow chart</strong> tab (when the
                        visual builder is enabled) to see a read-only diagram,
                        or inspect <code className="text-xs">flowGraph</code>{" "}
                        via the API.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  {errors.preservedBranchingFlowGraph?.message ? (
                    <p role="alert" className="text-sm text-destructive">
                      {String(errors.preservedBranchingFlowGraph.message)}
                    </p>
                  ) : null}
                  <p className="text-sm text-muted-foreground">
                    Steps are defined inside the branching graph (not as a
                    linear list).
                  </p>
                </div>
              ) : null}
              {!branchingGraphLocked
                ? stepArray.fields.map((field, index) => {
                    const actionType = form.watch(`steps.${index}.actionType`);
                    const config =
                      (form.watch(`steps.${index}.actionConfig`) as Record<
                        string,
                        unknown
                      >) ?? {};

                    return (
                      <div
                        key={field.id}
                        className="space-y-3 rounded-md border p-3"
                      >
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
                                const meta =
                                  AUTOMATION_ACTION_TYPE_DESCRIPTIONS[action];
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
                              checked={form.watch(
                                `steps.${index}.continueOnError`,
                              )}
                              onCheckedChange={(checked) =>
                                form.setValue(
                                  `steps.${index}.continueOnError`,
                                  checked,
                                )
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
                            <Trash2 className="h-4 w-4" />
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
                        "message" in
                          (errors.steps[index]?.actionConfig as object) ? (
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
                  })
                : null}
            </div>
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
