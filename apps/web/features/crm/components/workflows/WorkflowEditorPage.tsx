"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/useDebounce";
import { DEFAULT_PAGE } from "@/lib/apiTypes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SortableTableHead,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SortOrder } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  LayoutTemplate,
  Plus,
  Pencil,
  Trash2,
  Zap,
  Search,
} from "lucide-react";
import {
  useWorkflows,
  useWorkflowTemplates,
  useCreateWorkflow,
  useInstallWorkflowTemplate,
  useUpdateWorkflow,
  useDeleteWorkflow,
} from "../../hooks/use-workflows";
import { usePipelines } from "../../hooks/use-pipelines";
import type {
  Workflow,
  WorkflowTemplate,
} from "../../services/workflow.service";
import { WorkflowForm } from "./WorkflowForm";
import { WorkflowOnboarding } from "./workflow-onboarding";
import type {
  CreateWorkflowFormValues,
  UpdateWorkflowFormValues,
} from "../../validation";
import { useEnvFeatureFlag } from "@/features/flags";
import {
  EnvFeature,
  getWorkflowActionLabel,
  getWorkflowTriggerLabel,
} from "@repo/shared";

const DEFAULT_PAGE_SIZE = 10;

function getTemplateInstallLabel(template: WorkflowTemplate): string {
  switch (template.installState) {
    case "INSTALLED":
      return `Installed on ${template.installedPipelineName ?? "a pipeline"}`;
    case "OUTDATED":
      return `Installed on ${template.installedPipelineName ?? "a pipeline"} (update available)`;
    case "UNAVAILABLE":
      return "No compatible pipeline yet";
    default:
      return template.availablePipelines.length === 1
        ? `Ready for ${template.availablePipelines[0]?.name}`
        : `${template.availablePipelines.length} compatible pipelines`;
  }
}

export default function WorkflowEditorPage() {
  const workflowsEnabled = useEnvFeatureFlag(EnvFeature.CRM_WORKFLOWS);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    "name" | "pipeline" | "rules" | "active"
  >("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const debouncedSearch = useDebounce(search, 300);
  const { data, isLoading, isError, error } = useWorkflows(
    {
      page,
      limit: pageSize,
      search: debouncedSearch || undefined,
      isActive:
        isActiveFilter === "all" ? undefined : isActiveFilter === "active",
    },
    { enabled: workflowsEnabled },
  );
  const { data: pipelinesData } = usePipelines(undefined, {
    enabled: workflowsEnabled,
  });
  const {
    data: templatesData,
    isLoading: isTemplatesLoading,
    isError: isTemplatesError,
    error: templatesError,
  } = useWorkflowTemplates({
    enabled: workflowsEnabled,
  });
  const createMutation = useCreateWorkflow();
  const installTemplateMutation = useInstallWorkflowTemplate();
  const updateMutation = useUpdateWorkflow();
  const deleteMutation = useDeleteWorkflow();

  const [showCreate, setShowCreate] = useState(false);
  const [editWorkflow, setEditWorkflow] = useState<Workflow | null>(null);
  const [templateToInstall, setTemplateToInstall] =
    useState<WorkflowTemplate | null>(null);
  const [templatePipelineId, setTemplatePipelineId] = useState<string>("");
  const [templateShouldActivate, setTemplateShouldActivate] = useState(true);
  const [templatesBrowserOpen, setTemplatesBrowserOpen] = useState(false);

  const workflows = useMemo(() => data?.workflows ?? [], [data?.workflows]);
  const pagination = data?.pagination;
  const pipelines = pipelinesData?.pipelines ?? [];
  const templates = templatesData?.templates ?? [];
  const selectedTemplatePipeline =
    templateToInstall?.availablePipelines.find(
      (pipeline) => pipeline.id === templatePipelineId,
    ) ?? null;
  const sortedWorkflows = useMemo(() => {
    const direction = sortOrder === "desc" ? -1 : 1;
    return [...workflows].sort((a, b) => {
      const aValue =
        sortBy === "pipeline"
          ? (a.pipeline?.name ?? "").toLowerCase()
          : sortBy === "rules"
            ? a.rules.length
            : sortBy === "active"
              ? Number(a.isActive)
              : a.name.toLowerCase();
      const bValue =
        sortBy === "pipeline"
          ? (b.pipeline?.name ?? "").toLowerCase()
          : sortBy === "rules"
            ? b.rules.length
            : sortBy === "active"
              ? Number(b.isActive)
              : b.name.toLowerCase();
      if (aValue < bValue) return -1 * direction;
      if (aValue > bValue) return 1 * direction;
      return 0;
    });
  }, [sortBy, sortOrder, workflows]);

  const resetForm = () => {
    setShowCreate(false);
    setEditWorkflow(null);
  };

  const closeInstallDialog = () => {
    setTemplateToInstall(null);
    setTemplatePipelineId("");
    setTemplateShouldActivate(true);
  };

  const openInstallDialog = (template: WorkflowTemplate) => {
    setTemplateToInstall(template);
    setTemplatePipelineId(
      template.installedPipelineId ?? template.availablePipelines[0]?.id ?? "",
    );
    setTemplateShouldActivate(template.isInstalled ? template.isActive : true);
  };

  const openInstallFromTemplateBrowser = (template: WorkflowTemplate) => {
    setTemplatesBrowserOpen(false);
    openInstallDialog(template);
  };

  const handleCreate = (formData: CreateWorkflowFormValues) => {
    const rules =
      formData.rules && formData.rules.length > 0
        ? formData.rules.map((r) => ({
            trigger: r.trigger,
            triggerStageId: r.triggerStageId ?? null,
            action: r.action,
            actionConfig: r.actionConfig ?? {},
            ruleOrder: r.ruleOrder,
          }))
        : undefined;
    createMutation.mutate(
      {
        pipelineId: formData.pipelineId,
        name: formData.name,
        isActive: formData.isActive,
        rules,
      },
      { onSuccess: resetForm },
    );
  };

  const handleUpdate = (formData: UpdateWorkflowFormValues) => {
    if (!editWorkflow) return;
    updateMutation.mutate(
      {
        id: editWorkflow.id,
        data: {
          name: formData.name,
          isActive: formData.isActive,
          rules: formData.rules?.map((r) => ({
            trigger: r.trigger,
            triggerStageId: r.triggerStageId ?? null,
            action: r.action,
            actionConfig: r.actionConfig ?? {},
            ruleOrder: r.ruleOrder,
          })),
        },
      },
      { onSuccess: resetForm },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Pipeline Workflows
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Automate actions when deals move through pipeline stages.
        </p>
      </div>

      <WorkflowOnboarding />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Ready-made Workflow Templates</CardTitle>
            <CardDescription>
              Browse descriptions and install packs onto a pipeline. For a
              numbered setup guide, open{" "}
              <strong>How to set up workflows</strong> in the section above.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="shrink-0"
            onClick={() => setTemplatesBrowserOpen(true)}
            disabled={isTemplatesLoading || isTemplatesError}
          >
            <LayoutTemplate className="mr-2 h-4 w-4" aria-hidden />
            Browse templates
          </Button>
        </CardHeader>
        <CardContent>
          {isTemplatesLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading templates… open <strong>Browse templates</strong> when
              ready.
            </p>
          ) : isTemplatesError ? (
            <p className="text-sm text-destructive" role="alert">
              Failed to load workflow templates.{" "}
              {templatesError?.message ?? "Please try again."}
            </p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No workflow templates are available right now.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {templates.length} template
              {templates.length === 1 ? "" : "s"} available — click{" "}
              <strong>Browse templates</strong> to view details and install.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={templatesBrowserOpen}
        onOpenChange={setTemplatesBrowserOpen}
      >
        <DialogContent
          className="flex max-h-[min(90vh,800px)] max-w-5xl flex-col gap-0 p-0"
          allowDismiss={true}
        >
          <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 text-left">
            <DialogTitle>Workflow templates</DialogTitle>
            <DialogDescription>
              Each template lists what it automates. Install onto a compatible
              pipeline, then adjust rules in the workflow table below.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {isTemplatesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded bg-muted"
                  />
                ))}
              </div>
            ) : isTemplatesError ? (
              <p className="text-sm text-destructive" role="alert">
                Failed to load workflow templates.{" "}
                {templatesError?.message ?? "Please try again."}
              </p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No workflow templates are available right now.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
                {templates.map((template) => {
                  return (
                    <div
                      key={template.templateKey}
                      className="space-y-3 rounded-lg border p-4"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium">{template.name}</h3>
                          {template.recommended && (
                            <Badge variant="default" className="text-xs">
                              Recommended
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {template.category.replaceAll("_", " ")}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {template.installState.replaceAll("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>
                          Pipeline type:{" "}
                          {template.pipelineType.replaceAll("_", " ")}
                        </p>
                        <p>Objects: {template.supportedObjects.join(", ")}</p>
                        <p>{getTemplateInstallLabel(template)}</p>
                        {template.isInstalled && (
                          <p>
                            Workflow status:{" "}
                            {template.isActive ? "Active" : "Inactive"}
                          </p>
                        )}
                        <p>
                          {template.rulesPreview.length} rule
                          {template.rulesPreview.length === 1 ? "" : "s"}
                        </p>
                        {template.isOutdated && (
                          <p>Current version {template.version} is newer.</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={template.isInstalled ? "outline" : "default"}
                          disabled={
                            installTemplateMutation.isPending ||
                            template.installState === "UNAVAILABLE"
                          }
                          onClick={() =>
                            openInstallFromTemplateBrowser(template)
                          }
                        >
                          {template.isInstalled
                            ? "Review install"
                            : "Install template"}
                        </Button>
                        {template.isInstalled &&
                          template.installedWorkflowId && (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={updateMutation.isPending}
                              onClick={() =>
                                updateMutation.mutate({
                                  id: template.installedWorkflowId!,
                                  data: { isActive: !template.isActive },
                                })
                              }
                            >
                              {template.isActive
                                ? "Deactivate workflow"
                                : "Activate workflow"}
                            </Button>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Workflows</CardTitle>
            <CardDescription>
              Trigger tasks, notifications, or other actions when deal events
              occur.
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditWorkflow(null);
              setShowCreate(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> New Workflow
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 pb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(DEFAULT_PAGE);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={isActiveFilter}
              onValueChange={(value) => {
                setIsActiveFilter(value);
                setPage(DEFAULT_PAGE);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="inactive">Inactive only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : isError ? (
            <div className="py-6 text-center">
              <p className="text-sm text-destructive" role="alert">
                Failed to load workflows.{" "}
                {error?.message ?? "Please try again."}
              </p>
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">
                No workflows yet. Open <strong>Browse templates</strong> above
                or create a custom workflow to automate deal actions.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead
                        sortKey="name"
                        currentSortBy={sortBy}
                        currentSortOrder={sortOrder}
                        onSort={(nextSortBy, nextSortOrder) => {
                          setSortBy(nextSortBy as typeof sortBy);
                          setSortOrder(nextSortOrder);
                        }}
                      >
                        Name
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="pipeline"
                        currentSortBy={sortBy}
                        currentSortOrder={sortOrder}
                        onSort={(nextSortBy, nextSortOrder) => {
                          setSortBy(nextSortBy as typeof sortBy);
                          setSortOrder(nextSortOrder);
                        }}
                      >
                        Pipeline
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="rules"
                        currentSortBy={sortBy}
                        currentSortOrder={sortOrder}
                        onSort={(nextSortBy, nextSortOrder) => {
                          setSortBy(nextSortBy as typeof sortBy);
                          setSortOrder(nextSortOrder);
                        }}
                      >
                        Rules
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="active"
                        currentSortBy={sortBy}
                        currentSortOrder={sortOrder}
                        onSort={(nextSortBy, nextSortOrder) => {
                          setSortBy(nextSortBy as typeof sortBy);
                          setSortOrder(nextSortOrder);
                        }}
                        className="w-24"
                      >
                        Active
                      </SortableTableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedWorkflows.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium">{w.name}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div>{w.pipeline?.name ?? w.pipelineId}</div>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-xs">
                                {w.origin === "CUSTOM" ? "Custom" : "Template"}
                              </Badge>
                              {w.templateKey && (
                                <Badge variant="secondary" className="text-xs">
                                  {w.templateKey}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {w.rules.map((r) => (
                              <Badge
                                key={r.id}
                                variant="secondary"
                                className="text-xs"
                              >
                                {getWorkflowTriggerLabel(r.trigger)} →{" "}
                                {getWorkflowActionLabel(r.action)}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {w.isActive ? (
                              <Badge variant="default" className="text-xs">
                                Active
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                Off
                              </span>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Runs: {w.runCount ?? 0}
                              {w.failureCount
                                ? `, failures: ${w.failureCount}`
                                : ""}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => setEditWorkflow(w)}
                              aria-label={`Edit workflow ${w.name}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deleteMutation.mutate(w.id)}
                              disabled={deleteMutation.isPending}
                              aria-label={`Delete workflow ${w.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {pagination && (
                <DataTablePagination
                  pagination={{
                    currentPage: pagination.currentPage,
                    totalPages: pagination.totalPages,
                    totalItems: pagination.totalItems,
                    itemsPerPage: pagination.itemsPerPage,
                    hasNextPage: pagination.hasNextPage,
                    hasPrevPage: pagination.hasPrevPage,
                  }}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(DEFAULT_PAGE);
                  }}
                  isLoading={isLoading}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showCreate || !!editWorkflow}
        onOpenChange={(open) => !open && resetForm()}
      >
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          allowDismiss={true}
        >
          <DialogHeader>
            <DialogTitle>
              {editWorkflow ? "Edit Workflow" : "New Workflow"}
            </DialogTitle>
            <DialogDescription>
              {editWorkflow
                ? "Update the workflow rules, triggers, and activation state."
                : "Create a custom workflow for one of your CRM pipelines."}
            </DialogDescription>
          </DialogHeader>
          {(showCreate || editWorkflow) &&
            (editWorkflow ? (
              <WorkflowForm
                mode="edit"
                pipelines={pipelines}
                stages={
                  pipelines.find((p) => p.id === editWorkflow.pipelineId)
                    ?.stages ?? []
                }
                defaultValues={{
                  name: editWorkflow.name,
                  isActive: editWorkflow.isActive,
                  rules: editWorkflow.rules.map((r) => ({
                    trigger: r.trigger,
                    triggerStageId: r.triggerStageId,
                    action: r.action,
                    actionConfig: r.actionConfig ?? {},
                    ruleOrder: r.ruleOrder,
                  })),
                }}
                onSubmit={handleUpdate}
                onCancel={resetForm}
                isSubmitting={updateMutation.isPending}
              />
            ) : (
              <WorkflowForm
                mode="create"
                pipelines={pipelines}
                onSubmit={handleCreate}
                onCancel={resetForm}
                isSubmitting={createMutation.isPending}
              />
            ))}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!templateToInstall}
        onOpenChange={(open) => !open && closeInstallDialog()}
      >
        <DialogContent className="max-w-lg" allowDismiss={true}>
          <DialogHeader>
            <DialogTitle>
              {templateToInstall?.isInstalled
                ? "Review Workflow Template Install"
                : "Install Workflow Template"}
            </DialogTitle>
            <DialogDescription>
              Choose the target pipeline and confirm whether this template
              should create or overwrite an installed workflow.
            </DialogDescription>
          </DialogHeader>
          {templateToInstall && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-medium">{templateToInstall.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {templateToInstall.description}
                </p>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Install state:{" "}
                  {templateToInstall.installState.replaceAll("_", " ")}
                </p>
                <p>
                  Pipeline type:{" "}
                  {templateToInstall.pipelineType.replaceAll("_", " ")}
                </p>
                {templateToInstall.installedPipelineName && (
                  <p>
                    Current install: {templateToInstall.installedPipelineName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="templatePipelineId">Target pipeline</Label>
                <Select
                  value={templatePipelineId}
                  onValueChange={setTemplatePipelineId}
                >
                  <SelectTrigger id="templatePipelineId">
                    <SelectValue placeholder="Select a compatible pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {templateToInstall.availablePipelines.map((pipeline) => (
                      <SelectItem key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="templateActivate"
                  checked={templateShouldActivate}
                  onCheckedChange={setTemplateShouldActivate}
                />
                <Label htmlFor="templateActivate">
                  Activate workflow after install
                </Label>
              </div>

              <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                <p>
                  {templateToInstall.isInstalled
                    ? "Continuing will overwrite the existing installed template workflow and refresh its rules."
                    : "Continuing will create a workflow from this template on the selected pipeline."}
                </p>
                {selectedTemplatePipeline && (
                  <p className="mt-1">
                    Selected pipeline: {selectedTemplatePipeline.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Rule preview</p>
                <div className="space-y-1">
                  {templateToInstall.rulesPreview.map((rule, index) => (
                    <p
                      key={`${templateToInstall.templateKey}-${index}`}
                      className="text-sm text-muted-foreground"
                    >
                      {getWorkflowTriggerLabel(rule.trigger)}
                      {rule.triggerStageLabel
                        ? ` (${rule.triggerStageLabel})`
                        : ""}
                      {" -> "}
                      {getWorkflowActionLabel(rule.action)}
                    </p>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeInstallDialog}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={
                    installTemplateMutation.isPending ||
                    templatePipelineId.length === 0
                  }
                  onClick={() =>
                    installTemplateMutation.mutate(
                      {
                        templateKey: templateToInstall.templateKey,
                        data: {
                          pipelineId: templatePipelineId,
                          overwriteExisting: templateToInstall.isInstalled,
                          activate: templateShouldActivate,
                        },
                      },
                      {
                        onSuccess: () => closeInstallDialog(),
                      },
                    )
                  }
                >
                  {templateToInstall.isInstalled
                    ? "Overwrite template"
                    : "Install template"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
