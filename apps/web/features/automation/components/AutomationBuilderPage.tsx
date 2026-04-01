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
  useUpdateAutomationDefinition,
} from "../hooks/use-automation";
import type {
  AutomationDefinition,
  CreateAutomationDefinitionInput,
  UpdateAutomationDefinitionInput,
} from "../services/automation.service";
import type { AutomationDefinitionFormValues } from "../validation";

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
  const createAutomation = useCreateAutomationDefinition();
  const updateAutomation = useUpdateAutomationDefinition();
  const archiveAutomation = useArchiveAutomationDefinition();

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
        { onSuccess: () => setEditing(null) },
      );
      return;
    }
    createAutomation.mutate(payload, {
      onSuccess: () => setEditing(null),
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
            {editing ? (
              <Button variant="outline" onClick={() => setEditing(null)}>
                New
              </Button>
            ) : null}
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
              defaultValues={editing ? toFormValues(editing) : undefined}
              onSubmit={handleSubmit}
              isSubmitting={
                createAutomation.isPending || updateAutomation.isPending
              }
              onCancel={editing ? () => setEditing(null) : undefined}
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
