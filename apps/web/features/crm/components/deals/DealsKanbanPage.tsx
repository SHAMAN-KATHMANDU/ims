"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import {
  useDealsKanban,
  useUpdateDealStage,
  useDeleteDeal,
  useCreateDeal,
  useUpdateDeal,
  useDeal,
} from "../../hooks/use-deals";
import {
  usePipelines,
  useCreatePipeline,
  useUpdatePipeline,
} from "../../hooks/use-pipelines";
import { dealKeys } from "../../hooks/use-deals";
import { useQueryClient } from "@tanstack/react-query";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useFeatureFlag, useEnvFeatureFlag } from "@/features/flags";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";
import { DealForm } from "./DealForm";
import { DealDetail } from "./DealDetail";
import type {
  CreateDealData,
  UpdateDealData,
} from "../../services/deal.service";
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
  ArrowRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { Deal } from "../../services/deal.service";
import type {
  Pipeline,
  PipelineStage,
  PipelineType,
} from "../../services/pipeline.service";
import { getTransitionInfo } from "../../services/pipeline-transition.service";

type DrawerMode = "view" | "new" | "edit" | null;

export function DealsKanbanPage() {
  const params = useParams();
  const router = useRouter();
  const envDealsEnabled = useEnvFeatureFlag(EnvFeature.CRM_DEALS);
  const salesPipelineEnabled = useFeatureFlag(Feature.SALES_PIPELINE);
  if (!envDealsEnabled || !salesPipelineEnabled) notFound();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const isDesktop = useIsDesktop();
  const { toast } = useToast();

  const [pipelineId, setPipelineId] = useState<string>("");
  const [addPipelineOpen, setAddPipelineOpen] = useState(false);
  const [editPipelineOpen, setEditPipelineOpen] = useState(false);
  const [editStagesOpen, setEditStagesOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  const { data, isLoading } = useDealsKanban(pipelineId || undefined, {
    enabled: envDealsEnabled && salesPipelineEnabled,
  });
  const { data: pipelinesData } = usePipelines(undefined, {
    enabled: envDealsEnabled && salesPipelineEnabled,
  });
  const { data: selectedDealData } = useDeal(selectedDealId ?? "", {
    enabled: envDealsEnabled && salesPipelineEnabled && !!selectedDealId,
  });
  const updateStageMutation = useUpdateDealStage();
  const deleteDealMutation = useDeleteDeal();
  const createDealMutation = useCreateDeal();
  const updateDealMutation = useUpdateDeal();
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
        boardPipelineId: pipelineId || undefined,
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
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  const openNew = useCallback(() => {
    if (isDesktop) {
      setSelectedDealId(null);
      setDrawerMode("new");
    } else {
      router.push(`${basePath}/crm/deals/new`);
    }
  }, [isDesktop, router, basePath]);

  const openView = useCallback((id: string) => {
    setSelectedDealId(id);
    setDrawerMode("view");
  }, []);

  const openEdit = useCallback(
    (id: string) => {
      if (isDesktop) {
        setSelectedDealId(id);
        setDrawerMode("edit");
      } else {
        router.push(`${basePath}/crm/deals/${id}/edit`);
      }
    },
    [isDesktop, router, basePath],
  );

  const closeDrawer = useCallback(() => {
    setDrawerMode(null);
    setSelectedDealId(null);
  }, []);

  const handleCreateDeal = useCallback(
    async (data: CreateDealData) => {
      await createDealMutation.mutateAsync(data);
      toast({ title: "Deal created" });
      closeDrawer();
    },
    [createDealMutation, toast, closeDrawer],
  );

  const handleUpdateDeal = useCallback(
    async (data: UpdateDealData) => {
      if (!selectedDealId) return;
      const result = await updateDealMutation.mutateAsync({
        id: selectedDealId,
        data,
      });
      toast({ title: "Deal updated" });
      if (result?.deal?.id && result.deal.id !== selectedDealId) {
        setSelectedDealId(result.deal.id);
      }
      setDrawerMode("view");
    },
    [selectedDealId, updateDealMutation, toast],
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
          No pipeline yet. Create one to start organizing deals, or{" "}
          <Link
            href={`${basePath}/settings/crm`}
            className="underline hover:no-underline"
          >
            configure CRM defaults
          </Link>
          .
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
      <div>
        <h1 className="text-3xl font-bold">Deals</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your sales pipeline and track deals through stages.
        </p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                    {p.type && p.type !== "GENERAL"
                      ? ` (${p.type.replace("_", " ")})`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentPipeline?.type && currentPipeline.type !== "GENERAL" && (
              <Badge variant="outline" className="text-xs shrink-0">
                {currentPipeline.type.replace("_", " ")}
              </Badge>
            )}
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
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Deal
          </Button>
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

      {/* ── Mobile list view ─────────────────────────────────────────── */}
      <div className="sm:hidden space-y-4">
        {stages.map(
          (col) =>
            col.deals.length > 0 && (
              <div key={col.stage}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  {col.stage}
                  <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-xs font-normal">
                    {col.deals.length}
                  </span>
                </h3>
                <div className="space-y-2">
                  {col.deals.map((deal) => (
                    <div
                      key={deal.id}
                      className="rounded-lg border bg-card p-3 space-y-1.5 cursor-pointer"
                      onClick={() =>
                        router.push(`${basePath}/crm/deals/${deal.id}`)
                      }
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{deal.name}</span>
                        <span className="text-sm font-semibold text-primary shrink-0">
                          {formatCurrency(Number(deal.value))}
                        </span>
                      </div>
                      {(deal.contact || deal.expectedCloseDate) && (
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {deal.contact && (
                            <span>
                              {deal.contact.firstName}{" "}
                              {deal.contact.lastName || ""}
                            </span>
                          )}
                          {deal.expectedCloseDate && (
                            <span>
                              Closes{" "}
                              {new Date(
                                deal.expectedCloseDate,
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ),
        )}
        {stages.every((col) => col.deals.length === 0) && (
          <div className="rounded-md border py-8 text-center text-muted-foreground">
            No deals yet. Create one to get started.
          </div>
        )}
      </div>

      {/* ── Desktop kanban ───────────────────────────────────────────── */}
      <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
        <div className="hidden sm:flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
          {stages.map((col) => (
            <DroppableStageColumn
              key={col.stage}
              stage={col.stage}
              count={col.deals.length}
              pipelineType={currentPipeline?.type}
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
                  onView={openView}
                  onEdit={openEdit}
                />
              ))}
            </DroppableStageColumn>
          ))}
        </div>
      </DndContext>

      <ResponsiveDrawer
        open={drawerMode !== null}
        onOpenChange={(o) => !o && closeDrawer()}
        title={
          drawerMode === "new"
            ? "New Deal"
            : drawerMode === "edit"
              ? "Edit Deal"
              : "Deal Details"
        }
        size="2xl"
        bodyPadding={false}
      >
        {drawerMode === "view" && selectedDealId && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-end px-6 py-3 border-b shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openEdit(selectedDealId)}
              >
                Edit Deal
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <DealDetail
                dealId={selectedDealId}
                basePath={basePath}
                onEdit={() => openEdit(selectedDealId)}
              />
            </div>
          </div>
        )}
        {drawerMode === "new" && (
          <DealForm
            mode="create"
            initialPipelineId={pipelineId || currentPipeline?.id}
            onSubmit={handleCreateDeal}
            onCancel={closeDrawer}
            isLoading={createDealMutation.isPending}
          />
        )}
        {drawerMode === "edit" && selectedDealId && selectedDealData?.deal && (
          <DealForm
            mode="edit"
            deal={selectedDealData.deal}
            basePath={basePath}
            defaultValues={{
              name: selectedDealData.deal.name,
              value: Number(selectedDealData.deal.value),
              pipelineId: selectedDealData.deal.pipelineId,
              stage: selectedDealData.deal.stage,
              probability: selectedDealData.deal.probability,
              expectedCloseDate: selectedDealData.deal.expectedCloseDate
                ? new Date(selectedDealData.deal.expectedCloseDate)
                    .toISOString()
                    .slice(0, 10)
                : "",
              status: selectedDealData.deal.status,
              contactId: selectedDealData.deal.contactId ?? undefined,
              companyId: selectedDealData.deal.companyId ?? undefined,
              assignedToId: selectedDealData.deal.assignedToId ?? "",
              editReason: selectedDealData.deal.editReason ?? null,
              stageNames:
                (
                  selectedDealData.deal.pipeline as
                    | { stages?: Array<{ name: string }> }
                    | undefined
                )?.stages?.map((s) => s.name) ?? [],
            }}
            onSubmit={handleUpdateDeal}
            onCancel={() => setDrawerMode("view")}
            isLoading={updateDealMutation.isPending}
          />
        )}
      </ResponsiveDrawer>
    </div>
  );
}

function DroppableStageColumn({
  stage,
  count,
  pipelineType,
  children,
}: {
  stage: string;
  count: number;
  pipelineType?: PipelineType;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: stage });

  const isClosedWon = stage.toLowerCase().includes("closed won");
  const isClosedLost = stage.toLowerCase().includes("closed lost");
  const dealStatus = isClosedWon ? "WON" : isClosedLost ? "LOST" : null;
  const transitionInfo =
    pipelineType && dealStatus
      ? getTransitionInfo(pipelineType, dealStatus)
      : null;

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
      {transitionInfo && (
        <div className="mb-2 flex items-center gap-1.5 rounded-md bg-blue-50 dark:bg-blue-950/40 px-2 py-1.5 text-xs text-blue-700 dark:text-blue-300">
          <ArrowRight className="h-3 w-3 shrink-0" />
          <span>{transitionInfo.description}</span>
        </div>
      )}
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
  onView,
  onEdit,
}: {
  deal: Deal;
  basePath: string;
  stages: string[];
  onStageChange: (dealId: string, stage: string) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
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
        onView={onView}
        onEdit={onEdit}
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
  onView,
  onEdit,
}: {
  deal: Deal;
  basePath: string;
  stages: string[];
  onStageChange: (dealId: string, stage: string) => void;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const contactName = deal.contact
    ? `${deal.contact.firstName} ${deal.contact.lastName || ""}`.trim()
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
            {onView ? (
              <button
                type="button"
                className="font-medium hover:underline text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(deal.id);
                }}
              >
                {deal.name}
              </button>
            ) : (
              <Link
                href={`${basePath}/crm/deals/${deal.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="font-medium hover:underline">{deal.name}</span>
              </Link>
            )}
            <p className="text-sm text-muted-foreground">{contactName}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit(deal.id);
                }}
                aria-label="Edit deal"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
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
          </div>
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
        <DialogContent allowDismiss={false}>
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
  const [closedWonStageName, setClosedWonStageName] = useState(
    () => pipeline.closedWonStageName ?? "",
  );
  const [closedLostStageName, setClosedLostStageName] = useState(
    () => pipeline.closedLostStageName ?? "",
  );
  const updatePipeline = useUpdatePipeline();

  useEffect(() => {
    if (open) {
      setName(pipeline.name);
      setIsDefault(pipeline.isDefault);
      setClosedWonStageName(pipeline.closedWonStageName ?? "");
      setClosedLostStageName(pipeline.closedLostStageName ?? "");
    }
  }, [
    open,
    pipeline.name,
    pipeline.isDefault,
    pipeline.closedWonStageName,
    pipeline.closedLostStageName,
  ]);

  const stageNames = useMemo(
    () => normalizeStages(pipeline.stages).map((s) => s.name),
    [pipeline.stages],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = name.trim();
      if (!trimmed) return;
      updatePipeline.mutate(
        {
          id: pipeline.id,
          data: {
            name: trimmed,
            isDefault,
            closedWonStageName: closedWonStageName.trim()
              ? closedWonStageName.trim()
              : null,
            closedLostStageName: closedLostStageName.trim()
              ? closedLostStageName.trim()
              : null,
          },
        },
        {
          onSuccess: () => {
            onSuccess();
            onOpenChange(false);
          },
        },
      );
    },
    [
      pipeline.id,
      name,
      isDefault,
      closedWonStageName,
      closedLostStageName,
      updatePipeline,
      onSuccess,
      onOpenChange,
    ],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent allowDismiss={false}>
        <DialogHeader>
          <DialogTitle>Edit pipeline</DialogTitle>
          <DialogDescription>
            Change the pipeline name, default setting, or which stage name is
            set when a deal is marked won/lost (optional).
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-pipeline-won-stage">Closed won stage</Label>
              <Select
                value={closedWonStageName || "__none__"}
                onValueChange={(v) =>
                  setClosedWonStageName(v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger id="edit-pipeline-won-stage">
                  <SelectValue placeholder="No auto stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No auto stage</SelectItem>
                  {stageNames.map((sn) => (
                    <SelectItem key={`won-${sn}`} value={sn}>
                      {sn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pipeline-lost-stage">
                Closed lost stage
              </Label>
              <Select
                value={closedLostStageName || "__none__"}
                onValueChange={(v) =>
                  setClosedLostStageName(v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger id="edit-pipeline-lost-stage">
                  <SelectValue placeholder="No auto stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No auto stage</SelectItem>
                  {stageNames.map((sn) => (
                    <SelectItem key={`lost-${sn}`} value={sn}>
                      {sn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
      <DialogContent className="max-w-md" allowDismiss={false}>
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
