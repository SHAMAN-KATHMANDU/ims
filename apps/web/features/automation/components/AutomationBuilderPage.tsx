"use client";

import { useMemo, useState } from "react";
import { LayoutTemplate } from "lucide-react";
import { HelpTopicSheet } from "@/components/help-topic-sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { AutomationForm } from "./AutomationForm";
import { AutomationOnboarding } from "./automation-onboarding";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  hasPreservedBranchingFlowGraphShape,
  type AutomationDefinitionFormValues,
} from "../validation";
import {
  AUTOMATION_TEMPLATE_CATALOG,
  AUTOMATION_TEMPLATE_CATEGORIES,
  AUTOMATION_TEMPLATE_CATEGORY_LABELS,
  compileLinearStepsToFlowGraph,
  searchAutomationTemplates,
  tryDecompileLinearChainFlowGraph,
  tryDecompileLinearChainFlowGraphWithIds,
  type AutomationTemplateCatalogEntry,
  type AutomationTemplateCategory,
} from "@repo/shared";
import { EnvFeature, useEnvFeatureFlag } from "@/features/flags";
import {
  describeBranchDecisionLines,
  extractGraphBranchDecisions,
} from "../utils/automation-flow-graph-view";

function catalogTemplateToFormValues(
  entry: AutomationTemplateCatalogEntry,
): AutomationDefinitionFormValues {
  const v = entry.values;
  return {
    ...v,
    description: v.description ?? "",
    scopeId: v.scopeId ?? "",
  };
}

function toFormValues(
  automation: AutomationDefinition,
): AutomationDefinitionFormValues {
  const stepsFromGraph =
    automation.flowGraph && automation.steps.length === 0
      ? tryDecompileLinearChainFlowGraph(automation.flowGraph)
      : null;

  const isNonLinearGraphOnly =
    Boolean(automation.flowGraph) &&
    automation.steps.length === 0 &&
    stepsFromGraph === null;

  const steps = isNonLinearGraphOnly
    ? []
    : automation.steps.length > 0
      ? automation.steps.map((step) => ({
          actionType: step.actionType,
          actionConfig: step.actionConfig,
          continueOnError: step.continueOnError,
        }))
      : stepsFromGraph != null
        ? stepsFromGraph.map((step) => ({
            actionType: step.actionType,
            actionConfig: step.actionConfig,
            continueOnError: step.continueOnError ?? false,
          }))
        : [];

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
    steps,
    ...(isNonLinearGraphOnly
      ? { preservedBranchingFlowGraph: automation.flowGraph }
      : {}),
  };
}

export function AutomationBuilderPage() {
  const automationBranchingEnabled = useEnvFeatureFlag(
    EnvFeature.AUTOMATION_BRANCHING,
  );
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [editing, setEditing] = useState<AutomationDefinition | null>(null);
  const [draftValues, setDraftValues] = useState<
    AutomationDefinitionFormValues | undefined
  >(undefined);
  const [templatesDialogOpen, setTemplatesDialogOpen] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<
    AutomationTemplateCategory | "ALL"
  >("ALL");
  const [templateQuery, setTemplateQuery] = useState("");
  const debouncedTemplateQuery = useDebounce(templateQuery, 200);
  /** Blank create flow when not editing and no template draft */
  const [composerOpen, setComposerOpen] = useState(false);

  const filteredAutomationTemplates = useMemo(() => {
    const searched = searchAutomationTemplates(debouncedTemplateQuery);
    if (templateCategory === "ALL") return searched;
    return searched.filter((t) => t.category === templateCategory);
  }, [debouncedTemplateQuery, templateCategory]);
  const createAutomation = useCreateAutomationDefinition();
  const updateAutomation = useUpdateAutomationDefinition();
  const archiveAutomation = useArchiveAutomationDefinition();
  const replayAutomationEvent = useReplayAutomationEvent();

  const {
    data,
    isLoading,
    isError: definitionsError,
    error: definitionsErrorObj,
    refetch: refetchDefinitions,
  } = useAutomationDefinitions({
    search: debouncedSearch || undefined,
    page: 1,
    limit: 25,
  });
  const selectedAutomationId = editing?.id ?? data?.automations[0]?.id ?? "";
  const definitionForRuns = useMemo(() => {
    if (!data?.automations.length || !selectedAutomationId) return null;
    if (editing?.id === selectedAutomationId) return editing;
    return data.automations.find((a) => a.id === selectedAutomationId) ?? null;
  }, [data?.automations, editing, selectedAutomationId]);
  const {
    data: runsData,
    isLoading: runsLoading,
    isError: runsError,
  } = useAutomationRuns(
    selectedAutomationId,
    { limit: 5 },
    { enabled: !!selectedAutomationId },
  );

  const title = useMemo(
    () => (editing ? `Edit ${editing.name}` : "Create automation"),
    [editing],
  );

  /** Stable node ids when re-saving a graph-only linear chain without add/remove steps. */
  const editingLinearChainMeta = useMemo(() => {
    if (!editing?.flowGraph || editing.steps.length > 0) return null;
    return tryDecompileLinearChainFlowGraphWithIds(editing.flowGraph);
  }, [editing]);

  const flowCompileStableIds = useMemo(() => {
    if (!editingLinearChainMeta) return null;
    return {
      entryId: editingLinearChainMeta.entryNodeId,
      actionNodeIds: editingLinearChainMeta.actionNodeIds,
    };
  }, [editingLinearChainMeta]);

  const showAutomationForm =
    editing !== null || draftValues !== undefined || composerOpen;

  const beginEditAutomation = (automation: AutomationDefinition) => {
    setEditing(automation);
  };

  const buildPayload = (
    values: AutomationDefinitionFormValues,
  ): CreateAutomationDefinitionInput => {
    const base = {
      name: values.name,
      description: values.description || null,
      scopeType: values.scopeType,
      scopeId: values.scopeId || null,
      status: values.status,
      executionMode: values.executionMode,
      suppressLegacyWorkflows: values.suppressLegacyWorkflows,
      triggers: values.triggers.map((trigger) => ({
        eventName: trigger.eventName,
        conditions: trigger.conditions,
        delayMinutes: trigger.delayMinutes,
      })),
    };

    if (
      automationBranchingEnabled &&
      hasPreservedBranchingFlowGraphShape(values.preservedBranchingFlowGraph)
    ) {
      return {
        ...base,
        steps: [],
        flowGraph: values.preservedBranchingFlowGraph as NonNullable<
          CreateAutomationDefinitionInput["flowGraph"]
        >,
      };
    }

    if (automationBranchingEnabled && values.steps.length > 0) {
      const stableIds =
        editingLinearChainMeta &&
        values.steps.length === editingLinearChainMeta.actionNodeIds.length
          ? {
              entryId: editingLinearChainMeta.entryNodeId,
              actionNodeIds: editingLinearChainMeta.actionNodeIds,
            }
          : undefined;
      return {
        ...base,
        steps: [],
        flowGraph: compileLinearStepsToFlowGraph(
          values.steps.map((step) => ({
            actionType: step.actionType,
            actionConfig: step.actionConfig,
            continueOnError: step.continueOnError,
          })),
          stableIds,
        ),
      };
    }

    return {
      ...base,
      steps: values.steps.map((step) => ({
        actionType: step.actionType,
        actionConfig: step.actionConfig as NonNullable<
          CreateAutomationDefinitionInput["steps"]
        >[number]["actionConfig"],
        continueOnError: step.continueOnError,
      })),
    };
  };

  const handleSubmit = (values: AutomationDefinitionFormValues) => {
    const payload = buildPayload(values);
    if (editing) {
      updateAutomation.mutate(
        { id: editing.id, payload: payload as UpdateAutomationDefinitionInput },
        {
          onSuccess: () => {
            setEditing(null);
            setDraftValues(undefined);
            setComposerOpen(false);
          },
        },
      );
      return;
    }
    createAutomation.mutate(payload, {
      onSuccess: () => {
        setEditing(null);
        setDraftValues(undefined);
        setComposerOpen(false);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Event automations
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage cross-system automations for CRM, sales, inventory, transfers,
          and work items.
        </p>
        <p className="text-sm text-muted-foreground">
          Use the guide below for concepts and setup; open{" "}
          <strong>Templates</strong> for ready-made starters. Deal pipeline
          rules live under{" "}
          <strong className="text-foreground">Deal pipeline rules</strong> in
          settings.
        </p>
      </div>

      <AutomationOnboarding />

      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search automations"
              className="min-w-[12rem] flex-1"
            />
            {!showAutomationForm ? (
              <Button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setDraftValues(undefined);
                  setComposerOpen(true);
                }}
              >
                Create automation
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setTemplatesDialogOpen(true)}
            >
              <LayoutTemplate className="mr-2 h-4 w-4" aria-hidden />
              Templates
            </Button>
            {showAutomationForm ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setDraftValues(undefined);
                  setComposerOpen(true);
                }}
              >
                New
              </Button>
            ) : null}
          </div>

          <Dialog
            open={templatesDialogOpen}
            onOpenChange={(open) => {
              setTemplatesDialogOpen(open);
              if (!open) {
                setTemplateQuery("");
                setTemplateCategory("ALL");
              }
            }}
          >
            <DialogContent
              className="flex max-h-[min(90vh,720px)] max-w-3xl flex-col gap-0 p-0"
              allowDismiss={true}
            >
              <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 text-left">
                <DialogTitle>Automation templates</DialogTitle>
                <DialogDescription>
                  Pick a starter: we load it into the editor below so you can
                  adjust scope, triggers, and steps before saving.{" "}
                  {AUTOMATION_TEMPLATE_CATALOG.length} templates available.
                </DialogDescription>
              </DialogHeader>
              <div className="shrink-0 space-y-3 border-b px-6 py-3">
                <Input
                  value={templateQuery}
                  onChange={(e) => setTemplateQuery(e.target.value)}
                  placeholder="Search by name, tag, or description…"
                  aria-label="Search templates"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={templateCategory === "ALL" ? "default" : "outline"}
                    onClick={() => setTemplateCategory("ALL")}
                  >
                    All
                  </Button>
                  {AUTOMATION_TEMPLATE_CATEGORIES.map((cat) => (
                    <Button
                      key={cat}
                      type="button"
                      size="sm"
                      variant={templateCategory === cat ? "default" : "outline"}
                      onClick={() => setTemplateCategory(cat)}
                    >
                      {AUTOMATION_TEMPLATE_CATEGORY_LABELS[cat]}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                <div className="grid gap-4 sm:grid-cols-1">
                  {filteredAutomationTemplates.map((template) => (
                    <div
                      key={template.id}
                      data-testid={`automation-template-${template.id}`}
                      className="rounded-lg border bg-card p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{template.name}</h3>
                        <Badge variant="secondary">
                          {
                            AUTOMATION_TEMPLATE_CATEGORY_LABELS[
                              template.category
                            ]
                          }
                        </Badge>
                        <Badge variant="outline">{template.difficulty}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {template.description}
                      </p>
                      {template.tags.length ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {template.tags.join(" · ")}
                        </p>
                      ) : null}
                      <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">
                          When it runs
                        </p>
                        <ul className="list-disc space-y-1 pl-4">
                          {template.whenItRuns.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                        <p className="pt-1 font-medium text-foreground">
                          What it does
                        </p>
                        <ul className="list-disc space-y-1 pl-4">
                          {template.whatItDoes.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      </div>
                      <Button
                        className="mt-4"
                        size="sm"
                        onClick={() => {
                          setEditing(null);
                          setDraftValues(catalogTemplateToFormValues(template));
                          setTemplatesDialogOpen(false);
                        }}
                      >
                        Use this template
                      </Button>
                    </div>
                  ))}
                </div>
                {filteredAutomationTemplates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No templates match your filters.
                  </p>
                ) : null}
              </div>
              <DialogFooter className="shrink-0 border-t px-6 py-3 sm:justify-start">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setTemplatesDialogOpen(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="space-y-3">
            {definitionsError ? (
              <div
                role="alert"
                className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                <span>
                  {definitionsErrorObj instanceof Error
                    ? definitionsErrorObj.message
                    : "Failed to load automations."}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void refetchDefinitions()}
                >
                  Retry
                </Button>
              </div>
            ) : null}

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
                      {automation.steps.length > 0
                        ? `${automation.steps.length} step(s)`
                        : automation.flowGraph
                          ? "Graph body"
                          : "0 steps"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => beginEditAutomation(automation)}
                    >
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Archive
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Archive this automation?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            It will stop running for new events. You can create
                            a replacement later if needed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              archiveAutomation.mutate(automation.id)
                            }
                          >
                            Archive
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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

            {!isLoading &&
            !definitionsError &&
            data?.automations.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No automation definitions yet. Start from a template or create
                  a blank automation.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setTemplatesDialogOpen(true)}
                  >
                    <LayoutTemplate className="mr-2 h-4 w-4" aria-hidden />
                    Browse templates
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setEditing(null);
                      setDraftValues(undefined);
                      setComposerOpen(true);
                    }}
                  >
                    Create automation
                  </Button>
                </div>
              </div>
            ) : null}

            {data?.pagination && data.pagination.totalPages > 1 ? (
              <p className="text-xs text-muted-foreground">
                Showing page {data.pagination.currentPage} of{" "}
                {data.pagination.totalPages}. Use search to narrow results.
              </p>
            ) : null}
          </div>
        </div>

        {showAutomationForm ? (
          <div className="rounded-lg border p-4">
            <h2 className="mb-3 font-medium">{title}</h2>
            <AutomationForm
              defaultValues={editing ? toFormValues(editing) : draftValues}
              linearFlowCompileStableIds={flowCompileStableIds}
              onSubmit={handleSubmit}
              isSubmitting={
                createAutomation.isPending ||
                updateAutomation.isPending ||
                replayAutomationEvent.isPending
              }
              onCancel={() => {
                setEditing(null);
                setDraftValues(undefined);
                setComposerOpen(false);
              }}
            />
          </div>
        ) : null}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base font-medium">
                  Recent runs
                </CardTitle>
                <CardDescription className="mt-1">
                  Latest activity for the selected automation (failed runs can
                  be retried from each row).
                </CardDescription>
              </div>
              <HelpTopicSheet
                topicLabel="Recent runs and retries"
                sheetTitle="Recent runs and retries"
              >
                <p>
                  Failed runs can be retried in two ways:{" "}
                  <strong>Full replay</strong> re-queues the original event from
                  scratch (all matching automations may run again).{" "}
                  <strong>Resume failed steps</strong> continues this run from
                  the first failed linear step or graph action when you want to
                  avoid duplicating work that already succeeded. Graph runs may
                  show <strong>Branch decisions</strong> (frozen{" "}
                  <code className="text-xs">if</code> /{" "}
                  <code className="text-xs">switch</code> outcomes) on each row
                  when the API recorded them.
                </p>
              </HelpTopicSheet>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-6 pt-0">
            {runsLoading ? (
              <p className="text-sm text-muted-foreground">Loading runs…</p>
            ) : null}
            {runsError ? (
              <p className="text-sm text-destructive" role="alert">
                Could not load recent runs.
              </p>
            ) : null}
            {!runsLoading && !runsError && runsData?.runs.length ? (
              <div className="space-y-3">
                {runsData.runs.map((run) => {
                  const branchDecisions = extractGraphBranchDecisions(
                    run.stepOutput ?? undefined,
                  );
                  const branchLines =
                    branchDecisions != null
                      ? describeBranchDecisionLines(
                          definitionForRuns?.flowGraph,
                          branchDecisions,
                        )
                      : null;
                  return (
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
                      {branchLines?.length ? (
                        <div
                          className="mt-2 space-y-0.5 text-xs text-muted-foreground"
                          title="Frozen routing choices for this graph run (BR-16)"
                        >
                          <p className="font-medium text-foreground">
                            Branch decisions
                          </p>
                          <ul className="list-disc space-y-0.5 pl-4">
                            {branchLines.map((line, i) => (
                              <li key={`${run.id}-branch-${i}`}>{line}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {run.automationEventId && run.status === "FAILED" ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                Full replay
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Queue a full replay?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Re-queues the original event from scratch so
                                  all matching automations can run again. Use
                                  “Resume failed steps” instead if you only want
                                  to retry a failed run without duplicating side
                                  effects from steps that already succeeded.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    replayAutomationEvent.mutate({
                                      eventId: run.automationEventId!,
                                      payload: { reprocessFromStart: true },
                                    })
                                  }
                                >
                                  Full replay
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="secondary">
                                Resume failed steps
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Resume from the failed step?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Continues this failed run from the first
                                  failed linear step or graph action. If nothing
                                  is eligible, a full replay is queued instead.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    replayAutomationEvent.mutate({
                                      eventId: run.automationEventId!,
                                      payload: { reprocessFromStart: false },
                                    })
                                  }
                                >
                                  Resume
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ) : null}
                      {run.runSteps.length ? (
                        <div className="mt-2 space-y-1">
                          {run.runSteps.map((step) => (
                            <p
                              key={step.id}
                              className="text-xs text-muted-foreground"
                            >
                              {step.status}
                              {step.graphNodeId
                                ? ` · node ${step.graphNodeId}`
                                : ""}
                              {step.output
                                ? ` · ${JSON.stringify(step.output)}`
                                : ""}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
            {!runsLoading &&
            !runsError &&
            (!runsData?.runs.length || runsData.runs.length === 0) ? (
              <p className="text-sm text-muted-foreground">
                No runs recorded for the selected automation yet.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
