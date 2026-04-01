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
import { Trash2 } from "lucide-react";
import {
  AUTOMATION_ACTION_TYPE_VALUES,
  AUTOMATION_EXECUTION_MODE_VALUES,
  AUTOMATION_SCOPE_VALUES,
  AUTOMATION_STATUS_VALUES,
  AUTOMATION_TRIGGER_EVENT_VALUES,
  type AutomationActionTypeValue,
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
  "crm.deal.move_stage": "Move CRM deal stage",
  "crm.activity.create": "Create CRM activity",
  "webhook.emit": "Emit webhook",
};

const ACTION_ALLOWED_EVENTS = {
  "workitem.create": AUTOMATION_TRIGGER_EVENT_VALUES,
  "notification.send": AUTOMATION_TRIGGER_EVENT_VALUES,
  "transfer.create_draft": [
    "inventory.stock.low_detected",
    "inventory.stock.threshold_crossed",
  ],
  "record.update_field": AUTOMATION_TRIGGER_EVENT_VALUES,
  "crm.deal.move_stage": ["crm.deal.created", "crm.deal.stage_changed"],
  "crm.activity.create": ["crm.deal.created", "crm.deal.stage_changed"],
  "webhook.emit": AUTOMATION_TRIGGER_EVENT_VALUES,
} as const satisfies Record<AutomationActionTypeValue, readonly string[]>;

function isActionAllowedForEvent(
  actionType: AutomationActionTypeValue,
  eventName: string,
): boolean {
  return (ACTION_ALLOWED_EVENTS[actionType] as readonly string[]).includes(
    eventName,
  );
}

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
  const form = useForm<AutomationDefinitionFormValues>({
    resolver: zodResolver(AutomationDefinitionFormSchema),
    defaultValues: defaultValues ?? {
      name: "",
      description: "",
      scopeType: "GLOBAL",
      scopeId: "",
      status: "ACTIVE",
      executionMode: "LIVE",
      suppressLegacyWorkflows: false,
      triggers: [
        { eventName: "inventory.stock.low_detected", delayMinutes: 0 },
      ],
      steps: [
        {
          actionType: "workitem.create",
          actionConfig: getDefaultActionConfig("workitem.create"),
          continueOnError: false,
        },
      ],
    },
  });

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
        isActionAllowedForEvent(actionType, eventName),
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

  return (
    <form
      className="space-y-5 rounded-lg border p-4"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input {...form.register("name")} />
        </div>
        <div className="space-y-2">
          <Label>Scope</Label>
          <Select
            value={form.watch("scopeType")}
            onValueChange={(next) =>
              form.setValue(
                "scopeType",
                next as AutomationDefinitionFormValues["scopeType"],
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select scope" />
            </SelectTrigger>
            <SelectContent>
              {AUTOMATION_SCOPE_VALUES.map((scope) => (
                <SelectItem key={scope} value={scope}>
                  {scope}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Description</Label>
          <Textarea rows={3} {...form.register("description")} />
        </div>
        <div className="space-y-2">
          <Label>Scope id (optional)</Label>
          <Input
            placeholder="UUID for pipeline, location, or variation scope"
            {...form.register("scopeId")}
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={form.watch("status")}
            onValueChange={(next) =>
              form.setValue(
                "status",
                next as AutomationDefinitionFormValues["status"],
              )
            }
          >
            <SelectTrigger>
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
          <Label>Execution mode</Label>
          <Select
            value={form.watch("executionMode")}
            onValueChange={(next) =>
              form.setValue(
                "executionMode",
                next as AutomationDefinitionFormValues["executionMode"],
              )
            }
          >
            <SelectTrigger>
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
        </div>
        <div className="space-y-2 rounded-md border p-3 md:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <Label>Suppress legacy CRM workflows</Label>
              <p className="text-xs text-muted-foreground">
                When enabled on CRM automations, matching legacy CRM workflow
                rules are skipped to avoid duplicate side effects during
                migration.
              </p>
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
                delayMinutes: 0,
              })
            }
          >
            Add trigger
          </Button>
        </div>
        {triggerArray.fields.map((field, index) => (
          <div
            key={field.id}
            className="grid gap-2 rounded-md border p-3 md:grid-cols-[1fr_140px_auto]"
          >
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
              onClick={() => triggerArray.remove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-3">
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
                  onClick={() => stepArray.remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <ActionConfigFields
                actionType={actionType}
                value={config}
                onChange={(next) =>
                  form.setValue(`steps.${index}.actionConfig`, next)
                }
              />
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save automation"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
