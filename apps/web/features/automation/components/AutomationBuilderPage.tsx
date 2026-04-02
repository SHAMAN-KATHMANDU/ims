"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutomationForm } from "./AutomationForm";
import {
  useArchiveAutomationDefinition,
  useAutomationDefinitions,
  useAutomationRuns,
  useCreateAutomationDefinition,
  useReplayAutomationEvent,
  useUpdateAutomationDefinition,
} from "../hooks/use-automation";
import type {
  AutomationDefinition,
  CreateAutomationDefinitionInput,
  UpdateAutomationDefinitionInput,
} from "../services/automation.service";
import type { AutomationDefinitionFormValues } from "../validation";

const AUTOMATION_TEMPLATES: Array<{
  id: string;
  name: string;
  description: string;
  values: AutomationDefinitionFormValues;
}> = [
  {
    id: "sales-follow-up",
    name: "Sales follow-up",
    description: "Create a work item after a high-value sale.",
    values: {
      name: "High-value sale follow-up",
      description: "Assign a follow-up task when a high-value sale is created.",
      scopeType: "LOCATION",
      scopeId: "",
      status: "ACTIVE",
      executionMode: "LIVE",
      suppressLegacyWorkflows: false,
      triggers: [
        {
          eventName: "sales.sale.high_value_created",
          conditions: [{ path: "total", operator: "gte", value: 5000 }],
          delayMinutes: 0,
        },
      ],
      steps: [
        {
          actionType: "workitem.create",
          actionConfig: {
            title: "Follow up on premium sale",
            type: "FOLLOW_UP",
            priority: "HIGH",
            description: "Reach out after sale {{event.payload.saleCode}}",
          },
          continueOnError: false,
        },
      ],
    },
  },
  {
    id: "inventory-restock",
    name: "Inventory restock",
    description: "Draft a transfer when stock drops below threshold.",
    values: {
      name: "Inventory restock draft",
      description: "Create a transfer draft when low stock is detected.",
      scopeType: "LOCATION",
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
          actionType: "transfer.create_draft",
          actionConfig: {
            payloadPath: "suggestedTransfer",
          },
          continueOnError: false,
        },
      ],
    },
  },
  {
    id: "lead-routing",
    name: "Lead routing",
    description:
      "Create activity and update contact status after lead conversion.",
    values: {
      name: "Lead conversion routing",
      description: "Keep CRM records in sync when a lead converts.",
      scopeType: "GLOBAL",
      scopeId: "",
      status: "ACTIVE",
      executionMode: "LIVE",
      suppressLegacyWorkflows: false,
      triggers: [
        {
          eventName: "crm.lead.converted",
          conditions: [],
          delayMinutes: 0,
        },
      ],
      steps: [
        {
          actionType: "crm.contact.update",
          actionConfig: {
            contactIdTemplate: "{{event.payload.contactId}}",
            field: "status",
            value: "CUSTOMER",
          },
          continueOnError: false,
        },
        {
          actionType: "crm.activity.create",
          actionConfig: {
            type: "CALL",
            subject: "Converted lead follow-up",
          },
          continueOnError: true,
        },
      ],
    },
  },
];

function toFormValues(
  automation: AutomationDefinition,
): AutomationDefinitionFormValues {
  return {
    name: automation.name,
    description: automation.description ?? "",
    scopeType: automation.scopeType,
    scopeId: automation.scopeId ?? "",
    status: automation.status,
    executionMode: automation.executionMode,
    suppressLegacyWorkflows: automation.suppressLegacyWorkflows,
    triggers: automation.triggers.map((trigger) => ({
      eventName: trigger.eventName,
      conditions:
        trigger.conditionGroups?.map((condition) => ({
          path: condition.path,
          operator: condition.operator,
          value: condition.value,
        })) ?? [],
      delayMinutes: trigger.delayMinutes,
    })),
    steps: automation.steps.map((step) => ({
      actionType: step.actionType,
      actionConfig: step.actionConfig,
      continueOnError: step.continueOnError,
    })),
  };
}

export function AutomationBuilderPage() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AutomationDefinition | null>(null);
  const [draftValues, setDraftValues] = useState<
    AutomationDefinitionFormValues | undefined
  >(undefined);
  const createAutomation = useCreateAutomationDefinition();
  const updateAutomation = useUpdateAutomationDefinition();
  const archiveAutomation = useArchiveAutomationDefinition();
  const replayAutomationEvent = useReplayAutomationEvent();

  const { data, isLoading } = useAutomationDefinitions({
    search: search || undefined,
    page: 1,
    limit: 25,
  });
  const selectedAutomationId = editing?.id ?? data?.automations[0]?.id ?? "";
  const { data: runsData } = useAutomationRuns(
    selectedAutomationId,
    { limit: 5 },
    { enabled: !!selectedAutomationId },
  );

  const title = useMemo(
    () => (editing ? `Edit ${editing.name}` : "Create automation"),
    [editing],
  );

  const buildPayload = (
    values: AutomationDefinitionFormValues,
  ): CreateAutomationDefinitionInput => ({
    ...values,
    scopeId: values.scopeId || null,
    steps: values.steps.map((step) => ({
      actionType: step.actionType,
      actionConfig:
        step.actionConfig as CreateAutomationDefinitionInput["steps"][number]["actionConfig"],
      continueOnError: step.continueOnError,
    })),
  });

  const handleSubmit = (values: AutomationDefinitionFormValues) => {
    const payload = buildPayload(values);
    if (editing) {
      updateAutomation.mutate(
        { id: editing.id, payload: payload as UpdateAutomationDefinitionInput },
        {
          onSuccess: () => {
            setEditing(null);
            setDraftValues(undefined);
          },
        },
      );
      return;
    }
    createAutomation.mutate(payload, {
      onSuccess: () => {
        setEditing(null);
        setDraftValues(undefined);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Automation</h1>
        <p className="text-sm text-muted-foreground">
          Manage cross-system automations for CRM, sales, inventory, transfers,
          and work items.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,420px)]">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search automations"
            />
            {editing || draftValues ? (
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setDraftValues(undefined);
                }}
              >
                New
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {AUTOMATION_TEMPLATES.map((template) => (
              <div key={template.id} className="rounded-lg border p-3">
                <h3 className="font-medium">{template.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {template.description}
                </p>
                <Button
                  className="mt-3"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(null);
                    setDraftValues(template.values);
                  }}
                >
                  Use template
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading automations...
              </p>
            ) : null}

            {data?.automations.map((automation) => (
              <div
                key={automation.id}
                className="rounded-lg border p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="font-medium">{automation.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {automation.scopeType} · {automation.status} ·{" "}
                      {automation.executionMode}
                    </p>
                    {automation.suppressLegacyWorkflows ? (
                      <p className="text-xs text-amber-600">
                        Suppresses matching legacy CRM workflows
                      </p>
                    ) : null}
                    <p className="text-sm text-muted-foreground">
                      {automation.triggers.length} trigger(s) ·{" "}
                      {automation.steps.length} step(s)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(automation)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => archiveAutomation.mutate(automation.id)}
                    >
                      Archive
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {automation.triggers.map((trigger) => (
                    <span
                      key={trigger.id}
                      className="rounded-full bg-muted px-2 py-1 text-xs"
                    >
                      {trigger.eventName}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {!isLoading && data?.automations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No automation definitions yet.
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <h2 className="mb-3 font-medium">{title}</h2>
            <AutomationForm
              defaultValues={editing ? toFormValues(editing) : draftValues}
              onSubmit={handleSubmit}
              isSubmitting={
                createAutomation.isPending ||
                updateAutomation.isPending ||
                replayAutomationEvent.isPending
              }
              onCancel={
                editing || draftValues
                  ? () => {
                      setEditing(null);
                      setDraftValues(undefined);
                    }
                  : undefined
              }
            />
          </div>

          <div className="rounded-lg border p-4">
            <h2 className="mb-3 font-medium">Recent runs</h2>
            {runsData?.runs.length ? (
              <div className="space-y-3">
                {runsData.runs.map((run) => (
                  <div key={run.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{run.eventName}</span>
                      <span className="text-xs text-muted-foreground">
                        {run.status} · {run.executionMode}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {run.entityType} · {run.entityId}
                    </p>
                    {run.errorMessage ? (
                      <p className="mt-2 text-xs text-destructive">
                        {run.errorMessage}
                      </p>
                    ) : null}
                    {run.automationEventId && run.status === "FAILED" ? (
                      <Button
                        className="mt-2"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          replayAutomationEvent.mutate({
                            eventId: run.automationEventId!,
                            payload: { reprocessFromStart: true },
                          })
                        }
                      >
                        Replay event
                      </Button>
                    ) : null}
                    {run.runSteps.length ? (
                      <div className="mt-2 space-y-1">
                        {run.runSteps.map((step) => (
                          <p
                            key={step.id}
                            className="text-xs text-muted-foreground"
                          >
                            {step.status}
                            {step.output
                              ? ` · ${JSON.stringify(step.output)}`
                              : ""}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No runs recorded for the selected automation yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
