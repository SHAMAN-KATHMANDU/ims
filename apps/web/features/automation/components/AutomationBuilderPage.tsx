"use client";

import { useMemo, useState } from "react";
import { LayoutTemplate, AlertTriangle } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  useBulkToggleAutomations,
  useCreateAutomationDefinition,
  useReplayAutomationEvent,
  useToggleAutomationDefinition,
  useUpdateAutomationDefinition,
} from "../hooks/use-automation";
import { AutomationAnalyticsCard } from "./AutomationAnalyticsCard";
import { AutomationTestPanel } from "./AutomationTestPanel";
import { AutomationRunHistory } from "./AutomationRunHistory";
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
  tryExtractComposableFlowSegments,
  tryExtractIfElseAuthoringFromGraph,
  tryExtractSwitchAuthoringFromGraph,
  type AutomationTemplateCatalogEntry,
  type AutomationTemplateCategory,
} from "@repo/shared";
import { EnvFeature, useEnvFeatureFlag } from "@/features/flags";

function catalogTemplateToFormValues(
  entry: AutomationTemplateCatalogEntry,
): AutomationDefinitionFormValues {
  const v = entry.values;
  return {
    ...v,
    description: v.description ?? "",
    scopeId: v.scopeId ?? "",
    branchingCanvasAuthoring: false,
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

  const branchingCanvasAuthoring =
    Boolean(isNonLinearGraphOnly && automation.flowGraph) &&
    (tryExtractComposableFlowSegments(automation.flowGraph) != null ||
      tryExtractIfElseAuthoringFromGraph(automation.flowGraph) != null ||
      tryExtractSwitchAuthoringFromGraph(automation.flowGraph) != null);

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
    branchingCanvasAuthoring,
    ...(isNonLinearGraphOnly
      ? { preservedBranchingFlowGraph: automation.flowGraph }
      : {}),
  };
}

/** Returns pairs (a, b) of automations sharing any trigger+actionType. */
function detectConflicts(
  automations: AutomationDefinition[],
): Array<[AutomationDefinition, AutomationDefinition]> {
  const conflicts: Array<[AutomationDefinition, AutomationDefinition]> = [];
  for (let i = 0; i < automations.length; i++) {
    for (let j = i + 1; j < automations.length; j++) {
      const a = automations[i]!;
      const b = automations[j]!;
      if (a.status !== "ACTIVE" || b.status !== "ACTIVE") continue;
      const aEvents = new Set(a.triggers.map((t) => t.eventName));
      const bEvents = new Set(b.triggers.map((t) => t.eventName));
      const sharedEvent = [...aEvents].some((e) => bEvents.has(e));
      if (!sharedEvent) continue;
      const aTypes = new Set(a.steps.map((s) => s.actionType));
      const bTypes = new Set(b.steps.map((s) => s.actionType));
      const sharedType = [...aTypes].some((t) => bTypes.has(t));
      if (sharedType) conflicts.push([a, b]);
    }
  }
  return conflicts;
}

export function AutomationBuilderPage() {
  const automationBranchingEnabled = useEnvFeatureFlag(
    EnvFeature.AUTOMATION_BRANCHING,
  );
  const automationEnabled = useEnvFeatureFlag(EnvFeature.AUTOMATION);
  const crmWorkflowsEnabled = useEnvFeatureFlag(EnvFeature.CRM_WORKFLOWS);
  /** CRM-only mode: workflows flag on but full automation flag off */
  const crmOnly = crmWorkflowsEnabled && !automationEnabled;
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [editing, setEditing] = useState<AutomationDefinition | null>(null);
  const [draftValues, setDraftValues] = useState<
    AutomationDefinitionFormValues | undefined
  >(undefined);
  const [templatesDialogOpen, setTemplatesDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [testPanelId, setTestPanelId] = useState<string | null>(null);
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
  const toggleAutomation = useToggleAutomationDefinition();
  const replayAutomationEvent = useReplayAutomationEvent();
  const bulkToggle = useBulkToggleAutomations();

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
    ...(crmOnly ? { scopeType: "CRM_PIPELINE" } : {}),
  });
  const selectedAutomationId = editing?.id ?? data?.automations[0]?.id ?? "";

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

  /** Inline `toFormValues(editing)` produced a new object every render → form.reset loop (React #185). */
  const automationFormDefaultValues = useMemo(
    () => (editing ? toFormValues(editing) : draftValues),
    [editing, draftValues],
  );

  const showAutomationForm =
    editing !== null || draftValues !== undefined || composerOpen;

  /** Avoid two identical "Create automation" buttons (toolbar + empty state). */
  const showEmptyDefinitionsCtas =
    !isLoading && !definitionsError && (data?.automations.length ?? 0) === 0;

  const conflicts = useMemo(
    () => detectConflicts(data?.automations ?? []),
    [data?.automations],
  );

  const conflictingIds = useMemo(
    () => new Set(conflicts.flatMap(([a, b]) => [a.id, b.id])),
    [conflicts],
  );

  const allIds = data?.automations.map((a) => a.id) ?? [];
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

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
          {crmOnly ? "Deal pipeline automations" : "Event automations"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {crmOnly
            ? "Manage automations scoped to your CRM deal pipeline."
            : "Manage cross-system automations for CRM, sales, inventory, transfers, and work items."}
        </p>
        {!crmOnly && (
          <p className="text-sm text-muted-foreground">
            Use the guide below for concepts and setup; open{" "}
            <strong>Templates</strong> for ready-made starters. Deal pipeline
            rules live under{" "}
            <strong className="text-foreground">Deal pipeline rules</strong> in
            settings.
          </p>
        )}
      </div>

      <AutomationOnboarding />

      <div className="space-y-8">
        <div className="space-y-4">
          <div
            className="flex flex-wrap gap-2"
            data-testid="automation-builder-toolbar"
          >
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search automations"
              className="min-w-[12rem] flex-1"
            />
            {!showAutomationForm && !showEmptyDefinitionsCtas ? (
              <Button
                type="button"
                data-testid="automation-open-create-composer"
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

          {someSelected && (
            <div className="flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2">
              <span className="text-sm font-medium">
                {selectedIds.size} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkToggle.isPending}
                onClick={() => {
                  bulkToggle.mutate(
                    { ids: [...selectedIds], status: "ACTIVE" },
                    { onSuccess: () => setSelectedIds(new Set()) },
                  );
                }}
              >
                Activate all
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkToggle.isPending}
                onClick={() => {
                  bulkToggle.mutate(
                    { ids: [...selectedIds], status: "INACTIVE" },
                    { onSuccess: () => setSelectedIds(new Set()) },
                  );
                }}
              >
                Pause all
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
            </div>
          )}

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

            {allIds.length > 0 && (
              <div className="flex items-center gap-2 px-1">
                <Checkbox
                  id="select-all"
                  checked={allSelected}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedIds(new Set(allIds));
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                  aria-label="Select all automations"
                />
                <label
                  htmlFor="select-all"
                  className="text-xs text-muted-foreground cursor-pointer"
                >
                  Select all
                </label>
              </div>
            )}

            {data?.automations.map((automation) => (
              <div
                key={automation.id}
                className={`rounded-lg border p-4 shadow-sm ${
                  selectedIds.has(automation.id)
                    ? "border-primary/50 bg-primary/5"
                    : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.has(automation.id)}
                    onCheckedChange={(checked) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (checked) {
                          next.add(automation.id);
                        } else {
                          next.delete(automation.id);
                        }
                        return next;
                      });
                    }}
                    aria-label={`Select ${automation.name}`}
                    className="mt-1 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-medium">{automation.name}</h2>
                          {conflictingIds.has(automation.id) && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                              <AlertTriangle className="h-3 w-3" aria-hidden />
                              Conflict
                            </span>
                          )}
                        </div>
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
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            toggleAutomation.mutate({
                              id: automation.id,
                              status:
                                automation.status === "ACTIVE"
                                  ? "INACTIVE"
                                  : "ACTIVE",
                            })
                          }
                          disabled={toggleAutomation.isPending}
                        >
                          {automation.status === "ACTIVE"
                            ? "Pause"
                            : "Activate"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => beginEditAutomation(automation)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setTestPanelId(
                              testPanelId === automation.id
                                ? null
                                : automation.id,
                            )
                          }
                        >
                          Test
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
                                It will stop running for new events. You can
                                create a replacement later if needed.
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
                    {testPanelId === automation.id && (
                      <div className="mt-4">
                        <AutomationTestPanel
                          automationId={automation.id}
                          defaultEventName={
                            automation.triggers[0]?.eventName ?? ""
                          }
                        />
                      </div>
                    )}
                  </div>
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
                    data-testid="automation-open-create-composer"
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
              key={editing?.id ?? (draftValues ? "draft" : "new")}
              defaultValues={automationFormDefaultValues}
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

        {conflicts.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
            <div>
              <strong>Potential conflicts detected</strong>
              <ul className="mt-1 space-y-0.5 text-xs">
                {conflicts.map(([a, b], i) => (
                  <li key={i}>
                    <strong>{a.name}</strong> and <strong>{b.name}</strong>{" "}
                    share a trigger event and action type — both will run on the
                    same event.
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {selectedAutomationId && (
          <AutomationAnalyticsCard automationId={selectedAutomationId} />
        )}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base font-medium">
                  Recent runs
                </CardTitle>
                <CardDescription className="mt-1">
                  Latest executions — updates live via WebSocket. Failed runs
                  can be retried from each row.
                </CardDescription>
              </div>
              <HelpTopicSheet
                topicLabel="Recent runs and retries"
                sheetTitle="Recent runs and retries"
              >
                <div className="space-y-3 text-sm">
                  <p>
                    Failed runs can be retried in two ways:{" "}
                    <strong>Full replay</strong> re-queues the original event
                    from scratch (all matching automations may run again).{" "}
                    <strong>Resume failed steps</strong> continues <em>this</em>{" "}
                    run from the first failed step—linear order for classic
                    automations, or the next graph action after the last
                    successful one when the definition uses a{" "}
                    <code className="rounded bg-muted px-0.5 text-xs">
                      flowGraph
                    </code>
                    .
                  </p>
                  <p>
                    <strong>Graph runs and routing:</strong> once the system
                    picks an <code className="text-xs">if</code> or{" "}
                    <code className="text-xs">switch</code> branch, that choice
                    is <strong>frozen</strong> for the rest of the run (and on
                    resume). Changing the event payload before you resume does{" "}
                    <strong>not</strong> re-evaluate branches. The automation
                    also keeps the{" "}
                    <strong>graph version from when the run started</strong>, so
                    edits to the definition after the run began do not change
                    how resume walks the graph.
                  </p>
                  <p>
                    Treat retries like any automation: actions should be safe if
                    run more than once (idempotency). If you are unsure, use{" "}
                    <strong>Full replay</strong> only when you accept possible
                    duplicate side effects, or fix the automation first.
                  </p>
                  <p>
                    Rows may list <strong>Chosen path</strong> and{" "}
                    <strong>Branches not taken</strong> when the API recorded
                    routing metadata for a graph run.
                  </p>
                </div>
              </HelpTopicSheet>
            </div>
          </CardHeader>
          <CardContent className="px-6 pt-0">
            {selectedAutomationId ? (
              <AutomationRunHistory
                automationId={selectedAutomationId}
                limit={10}
              />
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                Select an automation above to see its run history.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
