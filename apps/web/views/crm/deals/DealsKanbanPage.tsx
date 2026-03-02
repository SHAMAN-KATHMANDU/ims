"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import {
  useDealsKanban,
  useUpdateDealStage,
  useDeleteDeal,
} from "@/hooks/useDeals";
import {
  usePipelines,
  useCreatePipeline,
  useUpdatePipeline,
} from "@/hooks/usePipelines";
import { dealKeys } from "@/hooks/useDeals";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  GripVertical,
  LayoutDashboard,
  Pencil,
  ListOrdered,
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Deal } from "@/services/dealService";
import type { Pipeline, PipelineStage } from "@/services/pipelineService";

export function DealsKanbanPage() {
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;

  const [pipelineId, setPipelineId] = useState<string>("");
  const [addPipelineOpen, setAddPipelineOpen] = useState(false);
  const [editPipelineOpen, setEditPipelineOpen] = useState(false);
  const [editStagesOpen, setEditStagesOpen] = useState(false);
  const { data, isLoading } = useDealsKanban(pipelineId || undefined);
  const { data: pipelinesData } = usePipelines();
  const updateStageMutation = useUpdateDealStage();
  const deleteDealMutation = useDeleteDeal();
  const qc = useQueryClient();
  const currentPipeline = (data?.pipeline ??
    pipelinesData?.pipelines?.find((p) => p.id === pipelineId)) as
    | Pipeline
    | undefined;

  const pipelines = useMemo(
    () => pipelinesData?.pipelines ?? [],
    [pipelinesData?.pipelines],
  );
  const stages = useMemo(() => data?.stages ?? [], [data?.stages]);
  const pipeline = data?.pipeline;

  useEffect(() => {
    const pipelineObj = pipeline as { id?: string } | undefined;
    if (!pipelineId && pipelineObj?.id) setPipelineId(pipelineObj.id);
    else if (!pipelineId && pipelines[0]?.id) setPipelineId(pipelines[0].id);
  }, [pipeline, pipelines, pipelineId]);

  const handleStageChange = useCallback(
    (dealId: string, newStage: string) => {
      updateStageMutation.mutate({
        id: dealId,
        stage: newStage,
        pipelineId: pipelineId || undefined,
      });
    },
    [updateStageMutation, pipelineId],
  );

  const stageNames = useMemo(() => stages.map((s) => s.stage), [stages]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over?.id || typeof over.id !== "string") return;
      const newStage = over.id;
      if (!stageNames.includes(newStage)) return;
      const dealId = String(active.id);
      const deal = stages
        .flatMap((col) => col.deals)
        .find((d) => d.id === dealId);
      if (deal && deal.stage !== newStage) {
        handleStageChange(dealId, newStage);
      }
    },
    [stages, stageNames, handleStageChange],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Deals</h1>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!pipeline && pipelines.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Deals</h1>
        <p className="text-muted-foreground">
          No pipeline yet. Create one to start organizing deals.
        </p>
        <AddPipelineDialog
          open={addPipelineOpen}
          onOpenChange={setAddPipelineOpen}
          onSuccess={(id) => {
            setPipelineId(id);
            setAddPipelineOpen(false);
          }}
          trigger={
            <Button>
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Create pipeline
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Deals</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Select value={pipelineId} onValueChange={setPipelineId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select pipeline" />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentPipeline && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    aria-label="Pipeline options"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setEditPipelineOpen(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit pipeline
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEditStagesOpen(true)}>
                    <ListOrdered className="h-4 w-4 mr-2" />
                    Edit stages
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <AddPipelineDialog
            open={addPipelineOpen}
            onOpenChange={setAddPipelineOpen}
            onSuccess={(id) => {
              setPipelineId(id);
              setAddPipelineOpen(false);
            }}
            trigger={
              <Button variant="outline" size="sm">
                <LayoutDashboard className="h-4 w-4 mr-1.5" />
                New pipeline
              </Button>
            }
          />
          <Link href={`${basePath}/crm/deals/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Deal
            </Button>
          </Link>
          {currentPipeline && (
            <>
              <EditPipelineDialog
                pipeline={currentPipeline}
                open={editPipelineOpen}
                onOpenChange={setEditPipelineOpen}
                onSuccess={() => {
                  qc.invalidateQueries({
                    queryKey: [...dealKeys.all, "kanban"],
                  });
                  setEditPipelineOpen(false);
                }}
              />
              <EditPipelineStagesDialog
                pipeline={currentPipeline}
                open={editStagesOpen}
                onOpenChange={setEditStagesOpen}
                onSuccess={() => {
                  qc.invalidateQueries({
                    queryKey: [...dealKeys.all, "kanban"],
                  });
                  setEditStagesOpen(false);
                }}
              />
            </>
          )}
        </div>
      </div>

      <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
          {stages.map((col) => (
            <DroppableStageColumn
              key={col.stage}
              stage={col.stage}
              count={col.deals.length}
            >
              {col.deals.map((deal) => (
                <DraggableDealCard
                  key={deal.id}
                  deal={deal}
                  basePath={basePath}
                  stages={stages.map((s) => s.stage)}
                  onStageChange={handleStageChange}
                  onDelete={(id) => deleteDealMutation.mutate(id)}
                  isDeleting={deleteDealMutation.isPending}
                />
              ))}
            </DroppableStageColumn>
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function DroppableStageColumn({
  stage,
  count,
  children,
}: {
  stage: string;
  count: number;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={`shrink-0 w-72 rounded-lg p-3 transition-colors min-h-[120px] ${
        isOver ? "bg-muted ring-2 ring-primary/50" : "bg-muted/50"
      }`}
    >
      <h3 className="font-semibold mb-3 flex items-center justify-between">
        {stage}
        <span className="text-sm font-normal text-muted-foreground">
          {count}
        </span>
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DraggableDealCard({
  deal,
  basePath,
  stages,
  onStageChange,
  onDelete,
  isDeleting,
}: {
  deal: Deal;
  basePath: string;
  stages: string[];
  onStageChange: (dealId: string, stage: string) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: deal.id,
      data: { currentStage: deal.stage },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-50" : ""}
    >
      <DealCard
        deal={deal}
        basePath={basePath}
        stages={stages}
        onStageChange={onStageChange}
        onDelete={onDelete}
        isDeleting={isDeleting}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function DealCard({
  deal,
  basePath,
  stages,
  onStageChange,
  onDelete,
  isDeleting,
  dragHandleProps,
}: {
  deal: Deal;
  basePath: string;
  stages: string[];
  onStageChange: (dealId: string, stage: string) => void;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const contactName = deal.contact
    ? `${deal.contact.firstName} ${deal.contact.lastName || ""}`.trim()
    : deal.member
      ? deal.member.name || deal.member.phone
      : deal.company?.name || "—";

  const handleConfirmDelete = useCallback(() => {
    onDelete?.(deal.id);
    setDeleteOpen(false);
  }, [deal.id, onDelete]);

  return (
    <>
      <Card className="cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors">
        <CardHeader className="p-3 pb-1 flex flex-row items-start gap-2">
          <div
            {...dragHandleProps}
            className="touch-none shrink-0 mt-0.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            onClick={(e) => e.preventDefault()}
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={`${basePath}/crm/deals/${deal.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="font-medium hover:underline">{deal.name}</span>
            </Link>
            <p className="text-sm text-muted-foreground">{contactName}</p>
          </div>
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDeleteOpen(true);
              }}
              disabled={isDeleting}
              aria-label="Delete deal"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          <p className="text-lg font-semibold">
            {formatCurrency(Number(deal.value))}
          </p>
          {deal.expectedCloseDate && (
            <p className="text-xs text-muted-foreground">
              Close: {new Date(deal.expectedCloseDate).toLocaleDateString()}
            </p>
          )}
          <Select
            value={deal.stage}
            onValueChange={(v) => onStageChange(deal.id, v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deal.name}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AddPipelineDialog({
  open,
  onOpenChange,
  onSuccess,
  trigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (id: string) => void;
  trigger: React.ReactNode;
}) {
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const createPipeline = useCreatePipeline();

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setName("");
        setIsDefault(false);
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = name.trim();
      if (!trimmed) return;
      createPipeline.mutate(
        { name: trimmed, isDefault },
        {
          onSuccess: (data) => {
            onSuccess(data.pipeline.id);
            handleOpenChange(false);
          },
        },
      );
    },
    [name, isDefault, createPipeline, onSuccess, handleOpenChange],
  );

  const triggerWithClick = React.isValidElement<{
    onClick?: React.MouseEventHandler;
  }>(trigger)
    ? React.cloneElement(trigger, {
        onClick: (e: React.MouseEvent) => {
          (
            trigger as React.ReactElement<{ onClick?: React.MouseEventHandler }>
          ).props?.onClick?.(e);
          onOpenChange(true);
        },
      })
    : trigger;

  return (
    <>
      {triggerWithClick}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New pipeline</DialogTitle>
            <DialogDescription>
              Add a pipeline to organize deals by stage, like a project board.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pipeline-name">Name</Label>
              <Input
                id="pipeline-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sales Pipeline"
                autoFocus
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pipeline-default"
                checked={isDefault}
                onCheckedChange={(v) => setIsDefault(v === true)}
              />
              <Label
                htmlFor="pipeline-default"
                className="text-sm font-normal cursor-pointer"
              >
                Set as default pipeline
              </Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || createPipeline.isPending}
              >
                {createPipeline.isPending ? "Creating…" : "Create pipeline"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditPipelineDialog({
  pipeline,
  open,
  onOpenChange,
  onSuccess,
}: {
  pipeline: Pipeline;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(pipeline.name);
  const [isDefault, setIsDefault] = useState(pipeline.isDefault);
  const updatePipeline = useUpdatePipeline();

  useEffect(() => {
    if (open) {
      setName(pipeline.name);
      setIsDefault(pipeline.isDefault);
    }
  }, [open, pipeline.name, pipeline.isDefault]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = name.trim();
      if (!trimmed) return;
      updatePipeline.mutate(
        { id: pipeline.id, data: { name: trimmed, isDefault } },
        {
          onSuccess: () => {
            onSuccess();
            onOpenChange(false);
          },
        },
      );
    },
    [pipeline.id, name, isDefault, updatePipeline, onSuccess, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit pipeline</DialogTitle>
          <DialogDescription>
            Change the pipeline name or default setting.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-pipeline-name">Name</Label>
            <Input
              id="edit-pipeline-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Pipeline name"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit-pipeline-default"
              checked={isDefault}
              onCheckedChange={(v) => setIsDefault(v === true)}
            />
            <Label
              htmlFor="edit-pipeline-default"
              className="text-sm font-normal cursor-pointer"
            >
              Set as default pipeline
            </Label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || updatePipeline.isPending}
            >
              {updatePipeline.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function normalizeStages(raw: PipelineStage[]): PipelineStage[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s, i) => ({
    id: s.id ?? String(i + 1),
    name: s.name ?? `Stage ${i + 1}`,
    order: s.order ?? i + 1,
    probability: s.probability ?? 0,
  }));
}

function EditPipelineStagesDialog({
  pipeline,
  open,
  onOpenChange,
  onSuccess,
}: {
  pipeline: Pipeline;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [stages, setStages] = useState<PipelineStage[]>(() =>
    normalizeStages(pipeline.stages),
  );
  const updatePipeline = useUpdatePipeline();

  useEffect(() => {
    if (open) setStages(normalizeStages(pipeline.stages));
  }, [open, pipeline.stages]);

  const updateStage = useCallback(
    (index: number, patch: Partial<PipelineStage>) => {
      setStages((prev) =>
        prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
      );
    },
    [],
  );

  const removeStage = useCallback((index: number) => {
    setStages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addStage = useCallback(() => {
    setStages((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: "New stage",
        order: prev.length + 1,
        probability: 0,
      },
    ]);
  }, []);

  const moveStage = useCallback((index: number, dir: -1 | 1) => {
    setStages((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      const a = next[index];
      const b = next[j];
      if (a === undefined || b === undefined) return prev;
      next[index] = b;
      next[j] = a;
      return next.map((s, i) => ({ ...s, order: i + 1 }));
    });
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const normalized = stages.map((s, i) => ({
        id: s.id.startsWith("new-") ? String(i + 1) : s.id,
        name: s.name.trim() || `Stage ${i + 1}`,
        order: i + 1,
        probability: s.probability ?? 0,
      }));
      updatePipeline.mutate(
        { id: pipeline.id, data: { stages: normalized } },
        {
          onSuccess: () => {
            onSuccess();
            onOpenChange(false);
          },
        },
      );
    },
    [pipeline.id, stages, updatePipeline, onSuccess, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit stages</DialogTitle>
          <DialogDescription>
            Add, remove, or reorder pipeline stages. Deal columns will update to
            match.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Stages</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addStage}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add stage
              </Button>
            </div>
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className="flex items-center gap-2 rounded-md border p-2 bg-muted/30"
                >
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <Input
                      value={stage.name}
                      onChange={(e) =>
                        updateStage(index, { name: e.target.value })
                      }
                      placeholder="Stage name"
                      className="h-8"
                    />
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground shrink-0">
                        Probability %
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={stage.probability ?? 0}
                        onChange={(e) =>
                          updateStage(index, {
                            probability: Math.min(
                              100,
                              Math.max(0, Number(e.target.value) || 0),
                            ),
                          })
                        }
                        className="h-7 w-16"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveStage(index, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveStage(index, 1)}
                      disabled={index === stages.length - 1}
                      aria-label="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeStage(index)}
                      disabled={stages.length <= 1}
                      aria-label="Remove stage"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updatePipeline.isPending}>
              {updatePipeline.isPending ? "Saving…" : "Save stages"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
