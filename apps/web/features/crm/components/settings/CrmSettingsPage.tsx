"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pencil,
  Plus,
  Trash2,
  GitBranch,
  Tag,
  Tags,
  GripVertical,
  Search,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DEFAULT_PAGE } from "@/lib/apiTypes";
import {
  usePipelines,
  usePipelineTemplates,
  useCreatePipeline,
  useUpdatePipeline,
  useDeletePipeline,
  useSeedPipelineFramework,
} from "../../hooks/use-pipelines";
import type { CrmPipelineTemplateDTO } from "../../services/pipeline.service";
import {
  useCrmSources,
  useCreateCrmSource,
  useUpdateCrmSource,
  useDeleteCrmSource,
} from "../../hooks/use-crm-settings";
import {
  useContactTags,
  useCreateContactTag,
  useUpdateContactTag,
  useDeleteContactTag,
} from "../../hooks/use-contacts";
import { useEnvFeatureFlag } from "@/features/flags";
import { EnvFeature } from "@/features/flags";
import type { PipelineStage } from "../../services/pipeline.service";
import type { CrmSource } from "../../services/crm-settings.service";

export default function CrmSettingsPage() {
  const pipelinesTabEnabled = useEnvFeatureFlag(EnvFeature.CRM_PIPELINES_TAB);
  const defaultTab = pipelinesTabEnabled ? "pipelines" : "tags";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CRM Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure pipelines and CRM contact metadata.
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-6 w-full sm:w-auto overflow-x-auto flex-nowrap">
          {pipelinesTabEnabled && (
            <TabsTrigger value="pipelines" className="gap-2 shrink-0">
              <GitBranch className="h-4 w-4" aria-hidden="true" />
              Pipelines
            </TabsTrigger>
          )}
          {pipelinesTabEnabled && (
            <TabsTrigger value="sources" className="gap-2 shrink-0">
              <Tag className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Contact </span>Sources
            </TabsTrigger>
          )}
          {pipelinesTabEnabled && (
            <TabsTrigger value="tags" className="gap-2 shrink-0">
              <Tags className="h-4 w-4" aria-hidden="true" />
              Tags
            </TabsTrigger>
          )}
        </TabsList>

        {pipelinesTabEnabled && (
          <TabsContent value="pipelines">
            <PipelineSettings />
          </TabsContent>
        )}
        {pipelinesTabEnabled && (
          <TabsContent value="sources">
            <SourceSettings />
          </TabsContent>
        )}
        <TabsContent value="tags">
          <TagSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Stage Builder (drag-and-drop) ─────────────────────────────────────────────

function StageBuilder({
  stages,
  onChange,
}: {
  stages: PipelineStage[];
  onChange: (stages: PipelineStage[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor));
  const ids = useMemo(() => stages.map((s) => s.id), [stages]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stages.findIndex((s) => s.id === active.id);
    const newIndex = stages.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(stages, oldIndex, newIndex).map((s, i) => ({
      ...s,
      order: i,
    }));
    onChange(reordered);
  };

  const updateStage = (id: string, name: string) => {
    onChange(stages.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  const removeStage = (id: string) => {
    const filtered = stages
      .filter((s) => s.id !== id)
      .map((s, i) => ({
        ...s,
        order: i,
      }));
    onChange(filtered);
  };

  const addStage = () => {
    onChange([
      ...stages,
      {
        id: crypto.randomUUID(),
        name: "",
        order: stages.length,
      },
    ]);
  };

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {stages.map((stage) => (
              <SortableStageItem
                key={stage.id}
                stage={stage}
                onNameChange={(name) => updateStage(stage.id, name)}
                onRemove={() => removeStage(stage.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button type="button" variant="outline" size="sm" onClick={addStage}>
        <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
        Add Stage
      </Button>
    </div>
  );
}

function SortableStageItem({
  stage,
  onNameChange,
  onRemove,
}: {
  stage: PipelineStage;
  onNameChange: (name: string) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded-md border bg-card ${isDragging ? "opacity-50 shadow-md" : ""}`}
    >
      <button
        type="button"
        className="cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <Input
        placeholder="Stage name"
        value={stage.name}
        onChange={(e) => onNameChange(e.target.value)}
        className="flex-1"
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
        onClick={onRemove}
        aria-label="Remove stage"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}

// ── Pipeline Settings ─────────────────────────────────────────────────────────

const PIPELINE_TYPE_LABELS: Record<string, string> = {
  GENERAL: "General",
  NEW_SALES: "New Sales",
  REMARKETING: "Remarketing",
  REPURCHASE: "Repurchase",
};

const DEFAULT_PIPELINE_PAGE_SIZE = 10;

function PipelineSettings() {
  const pipelinesTabEnabled = useEnvFeatureFlag(EnvFeature.CRM_PIPELINES_TAB);
  const [pipelinePage, setPipelinePage] = useState(DEFAULT_PAGE);
  const [pipelinePageSize, setPipelinePageSize] = useState(
    DEFAULT_PIPELINE_PAGE_SIZE,
  );
  const [pipelineSearch, setPipelineSearch] = useState("");
  const [pipelineSortBy, setPipelineSortBy] = useState<"name" | "default">(
    "name",
  );
  const [pipelineSortOrder, setPipelineSortOrder] = useState<SortOrder>("asc");
  const debouncedPipelineSearch = useDebounce(pipelineSearch, 300);
  const { data, isLoading } = usePipelines(
    {
      page: pipelinePage,
      limit: pipelinePageSize,
      search: debouncedPipelineSearch || undefined,
    },
    { enabled: pipelinesTabEnabled },
  );
  const { data: templatesPayload } = usePipelineTemplates({
    enabled: pipelinesTabEnabled,
  });
  const createMutation = useCreatePipeline();
  const updateMutation = useUpdatePipeline();
  const deleteMutation = useDeletePipeline();
  const seedMutation = useSeedPipelineFramework();

  const [showCreate, setShowCreate] = useState(false);
  const [editPipeline, setEditPipeline] = useState<{
    id: string;
    name: string;
    stages: PipelineStage[];
    isDefault: boolean;
    closedWonStageName?: string | null;
    closedLostStageName?: string | null;
  } | null>(null);
  const [newName, setNewName] = useState("");
  const [createStages, setCreateStages] = useState<PipelineStage[]>([]);
  const [editStages, setEditStages] = useState<PipelineStage[]>([]);
  const [createWonStageName, setCreateWonStageName] = useState<string>("");
  const [createLostStageName, setCreateLostStageName] = useState<string>("");
  const [editWonStageName, setEditWonStageName] = useState<string>("");
  const [editLostStageName, setEditLostStageName] = useState<string>("");

  const pipelines = useMemo(() => data?.pipelines ?? [], [data?.pipelines]);
  const pipelinePagination = data?.pagination;
  const catalogTemplates = templatesPayload?.templates ?? [];
  const sortedPipelines = useMemo(() => {
    const direction = pipelineSortOrder === "desc" ? -1 : 1;
    return [...pipelines].sort((a, b) => {
      const aValue =
        pipelineSortBy === "default"
          ? Number(a.isDefault)
          : a.name.toLowerCase();
      const bValue =
        pipelineSortBy === "default"
          ? Number(b.isDefault)
          : b.name.toLowerCase();
      if (aValue < bValue) return -1 * direction;
      if (aValue > bValue) return 1 * direction;
      return 0;
    });
  }, [pipelineSortBy, pipelineSortOrder, pipelines]);

  const applyTemplate = (t: CrmPipelineTemplateDTO) => {
    const stages = t.stageNames.map((name, i) => ({
      id: crypto.randomUUID(),
      name,
      order: i,
    }));
    createMutation.mutate(
      {
        name: t.name,
        type: t.type,
        stages,
        isDefault: t.suggestAsDefault && pipelines.length === 0,
        closedWonStageName: t.closedWonStageName ?? null,
        closedLostStageName: t.closedLostStageName ?? null,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewName("");
          setCreateStages([]);
        },
      },
    );
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    const stages = createStages
      .map((s, i) => ({ ...s, name: s.name.trim(), order: i }))
      .filter((s) => s.name);
    if (stages.length === 0) return;
    createMutation.mutate(
      {
        name: newName.trim(),
        stages,
        closedWonStageName: createWonStageName || null,
        closedLostStageName: createLostStageName || null,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewName("");
          setCreateStages([]);
          setCreateWonStageName("");
          setCreateLostStageName("");
        },
      },
    );
  };

  const handleUpdate = () => {
    if (!editPipeline) return;
    const stages = editStages
      .map((s, i) => ({ ...s, name: s.name.trim(), order: i }))
      .filter((s) => s.name);
    if (stages.length === 0) return;
    updateMutation.mutate(
      {
        id: editPipeline.id,
        data: {
          name: newName.trim() || editPipeline.name,
          stages,
          closedWonStageName: editWonStageName || null,
          closedLostStageName: editLostStageName || null,
        },
      },
      {
        onSuccess: () => {
          setEditPipeline(null);
          setNewName("");
          setEditStages([]);
          setEditWonStageName("");
          setEditLostStageName("");
        },
      },
    );
  };

  const openEdit = (p: (typeof pipelines)[0]) => {
    setEditPipeline({
      id: p.id,
      name: p.name,
      stages: p.stages,
      isDefault: p.isDefault,
      closedWonStageName: p.closedWonStageName ?? null,
      closedLostStageName: p.closedLostStageName ?? null,
    });
    setNewName(p.name);
    setEditWonStageName(p.closedWonStageName ?? "");
    setEditLostStageName(p.closedLostStageName ?? "");
    setEditStages(
      p.stages.map((s, i) => ({
        id: s.id,
        name: s.name,
        order: i,
      })),
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Deal Pipelines</CardTitle>
          <CardDescription>
            Manage deal pipelines and their stages. The default pipeline is used
            when creating new deals.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          {!pipelines.some((p) => p.type && p.type !== "GENERAL") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              {seedMutation.isPending
                ? "Setting up..."
                : "Setup Pipeline Framework"}
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => {
              setShowCreate(true);
              setNewName("");
              setCreateWonStageName("");
              setCreateLostStageName("");
              setCreateStages([
                { id: crypto.randomUUID(), name: "", order: 0 },
              ]);
            }}
          >
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" /> New Pipeline
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 pb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Search by name..."
              value={pipelineSearch}
              onChange={(e) => {
                setPipelineSearch(e.target.value);
                setPipelinePage(DEFAULT_PAGE);
              }}
              className="pl-9"
            />
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : pipelines.length === 0 ? (
          <div className="space-y-6 py-4">
            <div className="text-center text-muted-foreground">
              <GitBranch
                className="h-8 w-8 mx-auto mb-2 opacity-40"
                aria-hidden="true"
              />
              <p className="text-sm max-w-md mx-auto">
                No pipelines yet. Start from a template (recommended) or create
                a custom pipeline.
              </p>
            </div>
            {catalogTemplates.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {catalogTemplates.map((t) => (
                  <Card key={t.templateId} className="flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{t.name}</CardTitle>
                        {t.suggestAsDefault && (
                          <Badge variant="secondary" className="text-[10px]">
                            Suggested default
                          </Badge>
                        )}
                      </div>
                      {t.type && t.type !== "GENERAL" && (
                        <CardDescription className="text-xs">
                          {PIPELINE_TYPE_LABELS[t.type] ?? t.type}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-3">
                      <p className="text-sm text-muted-foreground flex-1">
                        {t.description}
                      </p>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => applyTemplate(t)}
                        disabled={createMutation.isPending}
                      >
                        {createMutation.isPending
                          ? "Creating…"
                          : "Use template"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    sortKey="name"
                    currentSortBy={pipelineSortBy}
                    currentSortOrder={pipelineSortOrder}
                    onSort={(nextSortBy, nextSortOrder) => {
                      setPipelineSortBy(nextSortBy as "name" | "default");
                      setPipelineSortOrder(nextSortOrder);
                    }}
                  >
                    Name
                  </SortableTableHead>
                  <TableHead>Stages</TableHead>
                  <SortableTableHead
                    sortKey="default"
                    currentSortBy={pipelineSortBy}
                    currentSortOrder={pipelineSortOrder}
                    onSort={(nextSortBy, nextSortOrder) => {
                      setPipelineSortBy(nextSortBy as "name" | "default");
                      setPipelineSortOrder(nextSortOrder);
                    }}
                    className="w-24"
                  >
                    Default
                  </SortableTableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPipelines.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        {p.name}
                        {p.type && p.type !== "GENERAL" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {PIPELINE_TYPE_LABELS[p.type] ?? p.type}
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {p.stages.map((s) => (
                          <Badge
                            key={s.id}
                            variant="secondary"
                            className="text-xs"
                          >
                            {s.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.isDefault && (
                        <Badge variant="default" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => openEdit(p)}
                          aria-label={`Edit pipeline ${p.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(p.id)}
                          disabled={p.isDefault || deleteMutation.isPending}
                          title={
                            p.isDefault
                              ? "Cannot delete default pipeline"
                              : "Delete pipeline"
                          }
                          aria-label={
                            p.isDefault
                              ? `Cannot delete default pipeline ${p.name}`
                              : `Delete pipeline ${p.name}`
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {pipelinePagination && (
          <DataTablePagination
            pagination={{
              currentPage: pipelinePagination.currentPage,
              totalPages: pipelinePagination.totalPages,
              totalItems: pipelinePagination.totalItems,
              itemsPerPage: pipelinePagination.itemsPerPage,
              hasNextPage: pipelinePagination.hasNextPage,
              hasPrevPage: pipelinePagination.hasPrevPage,
            }}
            onPageChange={setPipelinePage}
            onPageSizeChange={(size) => {
              setPipelinePageSize(size);
              setPipelinePage(DEFAULT_PAGE);
            }}
            isLoading={isLoading}
          />
        )}
      </CardContent>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent allowDismiss={false}>
          <DialogHeader>
            <DialogTitle>New Pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label
                htmlFor="pipeline-name-create"
                className="text-sm font-medium"
              >
                Pipeline Name
              </label>
              <Input
                id="pipeline-name-create"
                placeholder="e.g. Sales Pipeline"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Stages</label>
              <StageBuilder stages={createStages} onChange={setCreateStages} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Won Stage</label>
                <Select
                  value={createWonStageName || "__none__"}
                  onValueChange={(value) =>
                    setCreateWonStageName(value === "__none__" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select won stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {createStages
                      .filter((stage) => stage.name.trim())
                      .map((stage) => (
                        <SelectItem key={stage.id} value={stage.name.trim()}>
                          {stage.name.trim()}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Lost Stage</label>
                <Select
                  value={createLostStageName || "__none__"}
                  onValueChange={(value) =>
                    setCreateLostStageName(value === "__none__" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select lost stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {createStages
                      .filter((stage) => stage.name.trim())
                      .map((stage) => (
                        <SelectItem key={stage.id} value={stage.name.trim()}>
                          {stage.name.trim()}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !newName.trim() ||
                createMutation.isPending ||
                createStages.filter((s) => s.name.trim()).length === 0 ||
                (createWonStageName !== "" &&
                  createWonStageName === createLostStageName)
              }
            >
              {createMutation.isPending ? "Creating..." : "Create Pipeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editPipeline}
        onOpenChange={(open) => {
          if (!open) setEditPipeline(null);
        }}
      >
        <DialogContent allowDismiss={false}>
          <DialogHeader>
            <DialogTitle>Edit Pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label
                htmlFor="pipeline-name-edit"
                className="text-sm font-medium"
              >
                Pipeline Name
              </label>
              <Input
                id="pipeline-name-edit"
                placeholder="Pipeline name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Stages</label>
              <StageBuilder stages={editStages} onChange={setEditStages} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Won Stage</label>
                <Select
                  value={editWonStageName || "__none__"}
                  onValueChange={(value) =>
                    setEditWonStageName(value === "__none__" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select won stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {editStages
                      .filter((stage) => stage.name.trim())
                      .map((stage) => (
                        <SelectItem key={stage.id} value={stage.name.trim()}>
                          {stage.name.trim()}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Lost Stage</label>
                <Select
                  value={editLostStageName || "__none__"}
                  onValueChange={(value) =>
                    setEditLostStageName(value === "__none__" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select lost stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {editStages
                      .filter((stage) => stage.name.trim())
                      .map((stage) => (
                        <SelectItem key={stage.id} value={stage.name.trim()}>
                          {stage.name.trim()}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPipeline(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={
                updateMutation.isPending ||
                editStages.filter((s) => s.name.trim()).length === 0 ||
                (editWonStageName !== "" &&
                  editWonStageName === editLostStageName)
              }
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── Reusable inline-list settings component ───────────────────────────────────

interface ListSettingsProps {
  title: string;
  description: string;
  emptyIcon: React.ReactNode;
  emptyText: string;
  placeholder: string;
  items: Array<{ id: string; name: string; createdAt: string }>;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  onAdd: (name: string) => void;
  onUpdate: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  createMode?: "inline" | "dialog";
  createDialogTitle?: string;
}

function ListSettings({
  title,
  description,
  emptyIcon,
  emptyText,
  placeholder,
  items,
  isLoading,
  isCreating,
  isUpdating,
  isDeleting,
  onAdd,
  onUpdate,
  onDelete,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  createMode = "inline",
  createDialogTitle,
}: ListSettingsProps) {
  const [newName, setNewName] = useState("");
  const [editItem, setEditItem] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [editName, setEditName] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd(newName.trim());
    setNewName("");
    setCreateOpen(false);
  };

  const handleUpdate = () => {
    if (!editItem || !editName.trim()) return;
    onUpdate(editItem.id, editName.trim());
    setEditItem(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {onSearchChange != null && searchPlaceholder != null && (
          <div className="relative max-w-sm">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
        {/* Add control */}
        {createMode === "dialog" ? (
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              disabled={isCreating}
              className="shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
              {isCreating ? "Adding..." : "Add"}
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder={placeholder}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="flex-1"
            />
            <Button
              onClick={handleAdd}
              disabled={isCreating || !newName.trim()}
              className="shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
              {isCreating ? "Adding..." : "Add"}
            </Button>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            <div className="mx-auto mb-2 opacity-40 w-fit">{emptyIcon}</div>
            <p className="text-sm">{emptyText}</p>
          </div>
        ) : (
          <div className="border rounded-lg divide-y">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <span className="text-sm font-medium">{item.name}</span>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => {
                      setEditItem(item);
                      setEditName(item.name);
                    }}
                    aria-label={`Edit ${item.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onDelete(item.id)}
                    disabled={isDeleting}
                    aria-label={`Delete ${item.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create dialog */}
      <Dialog
        open={createMode === "dialog" ? createOpen : false}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setNewName("");
        }}
      >
        <DialogContent allowDismiss={false}>
          <DialogHeader>
            <DialogTitle>
              {createDialogTitle ?? `Add ${title.replace(/s$/, "")}`}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder={placeholder}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setNewName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!newName.trim() || isCreating}
            >
              {isCreating ? "Adding..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editItem}
        onOpenChange={(open) => {
          if (!open) setEditItem(null);
        }}
      >
        <DialogContent allowDismiss={false}>
          <DialogHeader>
            <DialogTitle>Edit {title.replace(/s$/, "")}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!editName.trim() || isUpdating}
            >
              {isUpdating ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

const DEFAULT_SOURCE_PAGE_SIZE = 10;
const DEFAULT_TAG_PAGE_SIZE = 10;

// ── Source Settings ───────────────────────────────────────────────────────────

function SourceSettings() {
  const pipelinesTabEnabled = useEnvFeatureFlag(EnvFeature.CRM_PIPELINES_TAB);
  const [sourcePage, setSourcePage] = useState(DEFAULT_PAGE);
  const [sourcePageSize, setSourcePageSize] = useState(
    DEFAULT_SOURCE_PAGE_SIZE,
  );
  const [sourceSearch, setSourceSearch] = useState("");
  const debouncedSourceSearch = useDebounce(sourceSearch, 300);
  const { data, isLoading } = useCrmSources(
    {
      page: sourcePage,
      limit: sourcePageSize,
      search: debouncedSourceSearch || undefined,
    },
    { enabled: pipelinesTabEnabled },
  );
  const createMutation = useCreateCrmSource();
  const updateMutation = useUpdateCrmSource();
  const deleteMutation = useDeleteCrmSource();

  const sources: CrmSource[] = data?.sources ?? [];
  const sourcePagination = data?.pagination;

  return (
    <>
      <ListSettings
        title="Contact Sources"
        description="Define where your contacts come from. These appear as options when creating or editing a contact."
        emptyIcon={<Tag className="h-8 w-8" aria-hidden="true" />}
        emptyText="No sources yet. Add one to get started."
        placeholder="e.g. Website, Referral, Social Media, Walk-in"
        createMode="dialog"
        createDialogTitle="Add Contact Source"
        items={sources}
        isLoading={isLoading}
        isCreating={createMutation.isPending}
        isUpdating={updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
        onAdd={(name) => createMutation.mutate(name)}
        onUpdate={(id, name) => updateMutation.mutate({ id, name })}
        onDelete={(id) => deleteMutation.mutate(id)}
        searchValue={sourceSearch}
        onSearchChange={(v) => {
          setSourceSearch(v);
          setSourcePage(DEFAULT_PAGE);
        }}
        searchPlaceholder="Search sources..."
      />
      {sourcePagination && (
        <DataTablePagination
          pagination={{
            currentPage: sourcePagination.currentPage,
            totalPages: sourcePagination.totalPages,
            totalItems: sourcePagination.totalItems,
            itemsPerPage: sourcePagination.itemsPerPage,
            hasNextPage: sourcePagination.hasNextPage,
            hasPrevPage: sourcePagination.hasPrevPage,
          }}
          onPageChange={setSourcePage}
          onPageSizeChange={(size) => {
            setSourcePageSize(size);
            setSourcePage(DEFAULT_PAGE);
          }}
          isLoading={isLoading}
        />
      )}
    </>
  );
}

// ── Tag Settings ──────────────────────────────────────────────────────────────

function TagSettings() {
  const [tagPage, setTagPage] = useState(DEFAULT_PAGE);
  const [tagPageSize, setTagPageSize] = useState(DEFAULT_TAG_PAGE_SIZE);
  const [tagSearch, setTagSearch] = useState("");
  const debouncedTagSearch = useDebounce(tagSearch, 300);
  const { data, isLoading } = useContactTags({
    page: tagPage,
    limit: tagPageSize,
    search: debouncedTagSearch || undefined,
  });
  const createMutation = useCreateContactTag();
  const updateMutation = useUpdateContactTag();
  const deleteMutation = useDeleteContactTag();

  const tags = (data?.tags ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    createdAt: t.createdAt ?? new Date().toISOString(),
  }));
  const tagPagination = data?.pagination;

  return (
    <>
      <ListSettings
        title="Contact Tags"
        description="Create tags to categorize contacts. Tags appear when creating or editing a contact."
        emptyIcon={<Tags className="h-8 w-8" aria-hidden="true" />}
        emptyText="No tags yet. Add one above."
        placeholder="e.g. VIP, Lead, Customer, Newsletter"
        items={tags}
        isLoading={isLoading}
        isCreating={createMutation.isPending}
        isUpdating={updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
        onAdd={(name) => createMutation.mutate(name)}
        onUpdate={(id, name) => updateMutation.mutate({ id, name })}
        onDelete={(id) => deleteMutation.mutate(id)}
        searchValue={tagSearch}
        onSearchChange={(v) => {
          setTagSearch(v);
          setTagPage(DEFAULT_PAGE);
        }}
        searchPlaceholder="Search tags..."
      />
      {tagPagination && (
        <DataTablePagination
          pagination={{
            currentPage: tagPagination.currentPage,
            totalPages: tagPagination.totalPages,
            totalItems: tagPagination.totalItems,
            itemsPerPage: tagPagination.itemsPerPage,
            hasNextPage: tagPagination.hasNextPage,
            hasPrevPage: tagPagination.hasPrevPage,
          }}
          onPageChange={setTagPage}
          onPageSizeChange={(size) => {
            setTagPageSize(size);
            setTagPage(DEFAULT_PAGE);
          }}
          isLoading={isLoading}
        />
      )}
    </>
  );
}
