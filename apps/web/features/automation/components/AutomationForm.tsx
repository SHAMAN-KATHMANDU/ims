"use client";

import { useEffect, useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Trash2 } from "lucide-react";
import { usePipelines } from "@/features/crm";
import { useActiveLocations } from "@/features/locations";
import {
  AUTOMATION_ACTION_TYPE_VALUES,
  AUTOMATION_EXECUTION_MODE_VALUES,
  AUTOMATION_SCOPE_VALUES,
  AUTOMATION_STATUS_VALUES,
  AUTOMATION_TRIGGER_EVENT_VALUES,
  isAutomationActionAllowedForEvent,
  type AutomationActionTypeValue,
  type AutomationCondition,
} from "@repo/shared";
import {
  AutomationDefinitionFormSchema,
  type AutomationDefinitionFormValues,
} from "../validation";

interface AutomationFormProps {
  defaultValues?: AutomationDefinitionFormValues;
  onSubmit: (values: AutomationDefinitionFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const ACTION_LABELS: Record<AutomationActionTypeValue, string> = {
  "workitem.create": "Create work item",
  "notification.send": "Send notification",
  "transfer.create_draft": "Create transfer draft",
  "record.update_field": "Update record field",
  "crm.contact.update": "Update CRM contact",
  "crm.company.update": "Update CRM company",
  "crm.deal.move_stage": "Move CRM deal stage",
  "crm.activity.create": "Create CRM activity",
  "webhook.emit": "Emit webhook",
};

const SCOPE_LABELS = {
  GLOBAL: "Global",
  CRM_PIPELINE: "CRM pipeline",
  LOCATION: "Location",
  PRODUCT_VARIATION: "Product variation",
} as const;

function getDefaultActionConfig(actionType: AutomationActionTypeValue) {
  switch (actionType) {
    case "workitem.create":
      return { title: "Follow up", type: "TASK", priority: "MEDIUM" };
    case "notification.send":
      return { title: "Automation notice", message: "Action completed" };
    case "transfer.create_draft":
      return { payloadPath: "suggestedTransfer" };
    case "record.update_field":
      return {
        entityType: "DEAL",
        entityIdTemplate: "{{event.entityId}}",
        field: "status",
        value: "OPEN",
      };
    case "crm.contact.update":
      return {
        contactIdTemplate: "{{event.payload.contactId}}",
        field: "status",
        value: "QUALIFIED",
      };
    case "crm.company.update":
      return {
        companyIdTemplate: "{{event.payload.companyId}}",
        field: "website",
        value: "https://example.com",
      };
    case "crm.deal.move_stage":
      return {
        dealIdTemplate: "{{event.entityId}}",
        targetStageId: "",
      };
    case "crm.activity.create":
      return { type: "CALL", subject: "Automation activity" };
    case "webhook.emit":
      return {
        url: "https://example.com/webhook",
        method: "POST",
        timeoutSeconds: 10,
      };
  }
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

function ActionConfigFields({
  actionType,
  value,
  onChange,
}: {
  actionType: AutomationActionTypeValue;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const update = (key: string, nextValue: unknown) =>
    onChange({ ...value, [key]: nextValue });

  if (actionType === "workitem.create") {
    return (
      <div className="grid gap-2 md:grid-cols-2">
        <Input
          placeholder="Title"
          value={String(value.title ?? "")}
          onChange={(e) => update("title", e.target.value)}
        />
        <Select
          value={String(value.type ?? "TASK")}
          onValueChange={(next) => update("type", next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Work item type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TASK">Task</SelectItem>
            <SelectItem value="APPROVAL">Approval</SelectItem>
            <SelectItem value="TRANSFER_REQUEST">Transfer request</SelectItem>
            <SelectItem value="RESTOCK_REQUEST">Restock request</SelectItem>
            <SelectItem value="FOLLOW_UP">Follow up</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Description"
          value={String(value.description ?? "")}
          onChange={(e) => update("description", e.target.value)}
        />
        <Select
          value={String(value.priority ?? "MEDIUM")}
          onValueChange={(next) => update("priority", next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (actionType === "notification.send") {
    return (
      <div className="grid gap-2">
        <Input
          placeholder="Notification title"
          value={String(value.title ?? "")}
          onChange={(e) => update("title", e.target.value)}
        />
        <Input
          placeholder="Notification message"
          value={String(value.message ?? "")}
          onChange={(e) => update("message", e.target.value)}
        />
      </div>
    );
  }

  if (actionType === "transfer.create_draft") {
    return (
      <div className="grid gap-2">
        <Input
          placeholder="Payload path"
          value={String(value.payloadPath ?? "suggestedTransfer")}
          onChange={(e) => update("payloadPath", e.target.value)}
        />
        <Input
          placeholder="Optional notes override"
          value={String(value.notes ?? "")}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>
    );
  }

  if (actionType === "webhook.emit") {
    return (
      <div className="grid gap-2 md:grid-cols-2">
        <Input
          placeholder="Webhook URL"
          value={String(value.url ?? "")}
          onChange={(e) => update("url", e.target.value)}
        />
        <Select
          value={String(value.method ?? "POST")}
          onValueChange={(next) => update("method", next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Payload path"
          value={String(value.payloadPath ?? "")}
          onChange={(e) => update("payloadPath", e.target.value)}
        />
        <Input
          type="number"
          min={1}
          max={60}
          placeholder="Timeout seconds"
          value={String(value.timeoutSeconds ?? 10)}
          onChange={(e) =>
            update(
              "timeoutSeconds",
              e.target.value ? Number(e.target.value) : undefined,
            )
          }
        />
      </div>
    );
  }

  if (actionType === "crm.deal.move_stage") {
    return (
      <div className="grid gap-2 md:grid-cols-2">
        <Input
          placeholder="Deal id template"
          value={String(value.dealIdTemplate ?? "{{event.entityId}}")}
          onChange={(e) => update("dealIdTemplate", e.target.value)}
        />
        <Input
          placeholder="Target stage id"
          value={String(value.targetStageId ?? "")}
          onChange={(e) => update("targetStageId", e.target.value)}
        />
      </div>
    );
  }

  if (actionType === "crm.activity.create") {
    return (
      <div className="grid gap-2 md:grid-cols-2">
        <Select
          value={String(value.type ?? "CALL")}
          onValueChange={(next) => update("type", next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Activity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CALL">Call</SelectItem>
            <SelectItem value="EMAIL">Email</SelectItem>
            <SelectItem value="MEETING">Meeting</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Subject"
          value={String(value.subject ?? "")}
          onChange={(e) => update("subject", e.target.value)}
        />
      </div>
    );
  }

  if (actionType === "crm.contact.update") {
    return (
      <div className="grid gap-2 md:grid-cols-3">
        <Input
          placeholder="Contact id template"
          value={String(
            value.contactIdTemplate ?? "{{event.payload.contactId}}",
          )}
          onChange={(e) => update("contactIdTemplate", e.target.value)}
        />
        <Select
          value={String(value.field ?? "status")}
          onValueChange={(next) => update("field", next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Field" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="source">Source</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="phone">Phone</SelectItem>
            <SelectItem value="ownerId">Owner</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="New value"
          value={String(value.value ?? "")}
          onChange={(e) => update("value", e.target.value)}
        />
      </div>
    );
  }

  if (actionType === "crm.company.update") {
    return (
      <div className="grid gap-2 md:grid-cols-3">
        <Input
          placeholder="Company id template"
          value={String(
            value.companyIdTemplate ?? "{{event.payload.companyId}}",
          )}
          onChange={(e) => update("companyIdTemplate", e.target.value)}
        />
        <Select
          value={String(value.field ?? "website")}
          onValueChange={(next) => update("field", next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Field" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="address">Address</SelectItem>
            <SelectItem value="phone">Phone</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="New value"
          value={String(value.value ?? "")}
          onChange={(e) => update("value", e.target.value)}
        />
      </div>
    );
  }

  return (
    <Textarea
      rows={4}
      value={JSON.stringify(value, null, 2)}
      onChange={(e) => {
        try {
          onChange(JSON.parse(e.target.value) as Record<string, unknown>);
        } catch {
          onChange(value);
        }
      }}
    />
  );
}

export function AutomationForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
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
  const selectedTriggerEvents = form.watch("triggers");
  const compatibleActionTypes = useMemo(() => {
    const events = selectedTriggerEvents.map((trigger) => trigger.eventName);

    return AUTOMATION_ACTION_TYPE_VALUES.filter((actionType) =>
      events.some((eventName) =>
        isAutomationActionAllowedForEvent(actionType, eventName),
      ),
    );
  }, [selectedTriggerEvents]);

  useEffect(() => {
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
  }, [compatibleActionTypes, form, stepArray.fields]);

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

  return (
    <Form {...form}>
      <form
        className="space-y-5 rounded-lg border p-4"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        {Object.keys(errors).length > 0 ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            Some fields need attention. Review the messages below and try again.
          </div>
        ) : null}

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
            <Label htmlFor="automation-scope-type">Scope</Label>
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
            <FormDescription>
              Global runs tenant-wide. CRM pipeline, location, or product
              variation limits events to that target—choose the matching scope
              target below when required.
            </FormDescription>
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
            <Label htmlFor="automation-scope-target">Scope target</Label>
            <FormDescription>
              Required for CRM pipeline, location, or product variation scopes.
              Global scope ignores this field.
            </FormDescription>
            {scopeType === "CRM_PIPELINE" ? (
              <Select
                value={form.watch("scopeId") || ""}
                onValueChange={(next) => form.setValue("scopeId", next)}
              >
                <SelectTrigger id="automation-scope-target">
                  <SelectValue placeholder={getScopeIdPlaceholder(scopeType)} />
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
                  <SelectValue placeholder={getScopeIdPlaceholder(scopeType)} />
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
                  errors.scopeId ? "automation-scope-target-error" : undefined
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
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="automation-execution-mode">Execution mode</Label>
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
                    {mode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              <strong>LIVE</strong> performs real actions.{" "}
              <strong>SHADOW</strong> simulates steps and records previews in
              run history without changing data—use while testing, then switch
              to LIVE.
            </FormDescription>
          </div>
          <div className="space-y-2 rounded-md border p-3 md:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <Label>Suppress legacy CRM workflows</Label>
                <FormDescription className="mt-1">
                  When enabled, matching rules from{" "}
                  <strong>Settings → CRM → Workflows</strong> are skipped for
                  the same deal events so you do not double-create tasks or
                  notifications while both systems are in use.
                </FormDescription>
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
          <div className="flex items-center justify-between">
            <Label>Triggers</Label>
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
                  <SelectContent>
                    {AUTOMATION_TRIGGER_EVENT_VALUES.map((eventName) => (
                      <SelectItem key={eventName} value={eventName}>
                        {eventName}
                      </SelectItem>
                    ))}
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
                        form.getValues(`triggers.${index}.conditions`) ?? [];
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
                      errors.triggers?.[index]?.conditions?.[conditionIndex];
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
                              {[
                                "eq",
                                "neq",
                                "gt",
                                "gte",
                                "lt",
                                "lte",
                                "contains",
                                "in",
                                "exists",
                              ].map((operator) => (
                                <SelectItem key={operator} value={operator}>
                                  {operator}
                                </SelectItem>
                              ))}
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
                                current.filter((_, i) => i !== conditionIndex),
                              );
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {conditionFieldErrors?.path?.message ? (
                          <p role="alert" className="text-xs text-destructive">
                            {conditionFieldErrors.path.message}
                          </p>
                        ) : null}
                        {conditionFieldErrors?.value?.message ? (
                          <p role="alert" className="text-xs text-destructive">
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
          <p className="text-xs text-muted-foreground">{stepAutoAdjustNote}</p>
          <div className="flex items-center justify-between">
            <Label>Steps</Label>
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
          </div>
          {stepArray.fields.map((field, index) => {
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
                      {compatibleActionTypes.map((action) => (
                        <SelectItem key={action} value={action}>
                          {ACTION_LABELS[action]}
                        </SelectItem>
                      ))}
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
  );
}
