"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Zap, Search } from "lucide-react";
import {
  useWorkflows,
  useCreateWorkflow,
  useUpdateWorkflow,
  useDeleteWorkflow,
} from "../../hooks/use-workflows";
import { usePipelines } from "../../hooks/use-pipelines";
import type {
  Workflow,
  WorkflowTrigger,
  WorkflowAction,
} from "../../services/workflow.service";
import { WorkflowForm } from "./WorkflowForm";
import type {
  CreateWorkflowFormValues,
  UpdateWorkflowFormValues,
} from "../../validation";
import { useEnvFeatureFlag } from "@/features/flags";
import { EnvFeature } from "@repo/shared";
import { useMemo } from "react";

const TRIGGER_LABELS: Record<WorkflowTrigger, string> = {
  STAGE_ENTER: "Stage enter",
  STAGE_EXIT: "Stage exit",
  DEAL_CREATED: "Deal created",
  DEAL_WON: "Deal won",
  DEAL_LOST: "Deal lost",
  PURCHASE_COUNT_CHANGED: "Purchase count changed",
};

const ACTION_LABELS: Record<WorkflowAction, string> = {
  CREATE_TASK: "Create task",
  SEND_NOTIFICATION: "Send notification",
  MOVE_STAGE: "Move stage",
  UPDATE_FIELD: "Update field",
  CREATE_ACTIVITY: "Create activity",
  CREATE_DEAL: "Create deal",
  UPDATE_CONTACT_FIELD: "Update contact field",
  APPLY_TAG: "Apply tag",
  REMOVE_TAG: "Remove tag",
};

const DEFAULT_PAGE_SIZE = 10;

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
  const createMutation = useCreateWorkflow();
  const updateMutation = useUpdateWorkflow();
  const deleteMutation = useDeleteWorkflow();

  const [showCreate, setShowCreate] = useState(false);
  const [editWorkflow, setEditWorkflow] = useState<Workflow | null>(null);

  const workflows = useMemo(() => data?.workflows ?? [], [data?.workflows]);
  const pagination = data?.pagination;
  const pipelines = pipelinesData?.pipelines ?? [];
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
                No workflows yet. Create one to automate deal actions.
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
                          {w.pipeline?.name ?? w.pipelineId}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {w.rules.map((r) => (
                              <Badge
                                key={r.id}
                                variant="secondary"
                                className="text-xs"
                              >
                                {TRIGGER_LABELS[r.trigger]} →{" "}
                                {ACTION_LABELS[r.action]}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {w.isActive ? (
                            <Badge variant="default" className="text-xs">
                              Active
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Off
                            </span>
                          )}
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
    </div>
  );
}
