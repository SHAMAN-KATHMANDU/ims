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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pencil,
  Plus,
  Trash2,
  GitBranch,
  Tag,
  Route,
  Tags,
  GripVertical,
} from "lucide-react";
import {
  usePipelines,
  useCreatePipeline,
  useUpdatePipeline,
  useDeletePipeline,
  useSeedPipelineFramework,
} from "../../hooks/use-pipelines";
import {
  useCrmSources,
  useCreateCrmSource,
  useUpdateCrmSource,
  useDeleteCrmSource,
  useCrmJourneyTypes,
  useCreateCrmJourneyType,
  useUpdateCrmJourneyType,
  useDeleteCrmJourneyType,
} from "../../hooks/use-crm-settings";
import {
  useContactTags,
  useCreateContactTag,
  useUpdateContactTag,
  useDeleteContactTag,
} from "../../hooks/use-contacts";
import type { PipelineStage } from "../../services/pipeline.service";
import type {
  CrmSource,
  CrmJourneyType,
} from "../../services/crm-settings.service";

export default function CrmSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CRM Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure pipelines, contact sources, and journey types for your CRM.
        </p>
      </div>

      <Tabs defaultValue="pipelines">
        <TabsList className="mb-6 w-full sm:w-auto overflow-x-auto flex-nowrap">
          <TabsTrigger value="pipelines" className="gap-2 shrink-0">
            <GitBranch className="h-4 w-4" />
            Pipelines
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-2 shrink-0">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Contact </span>Sources
          </TabsTrigger>
          <TabsTrigger value="journey-types" className="gap-2 shrink-0">
            <Route className="h-4 w-4" />
            <span className="hidden sm:inline">Journey </span>Types
          </TabsTrigger>
          <TabsTrigger value="tags" className="gap-2 shrink-0">
            <Tags className="h-4 w-4" />
            Tags
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipelines">
          <PipelineSettings />
        </TabsContent>
        <TabsContent value="sources">
          <SourceSettings />
        </TabsContent>
        <TabsContent value="journey-types">
          <JourneyTypeSettings />
        </TabsContent>
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
        probability: 0,
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
        <Plus className="h-4 w-4 mr-1" />
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
        <GripVertical className="h-4 w-4" />
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
        <Trash2 className="h-3.5 w-3.5" />
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

function PipelineSettings() {
  const { data, isLoading } = usePipelines();
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
  } | null>(null);
  const [newName, setNewName] = useState("");
  const [createStages, setCreateStages] = useState<PipelineStage[]>([]);
  const [editStages, setEditStages] = useState<PipelineStage[]>([]);

  const pipelines = data?.pipelines ?? [];

  const handleCreate = () => {
    if (!newName.trim()) return;
    const stages = createStages
      .map((s, i) => ({ ...s, name: s.name.trim(), order: i }))
      .filter((s) => s.name);
    if (stages.length === 0) return;
    createMutation.mutate(
      { name: newName.trim(), stages },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewName("");
          setCreateStages([]);
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
        data: { name: newName.trim() || editPipeline.name, stages },
      },
      {
        onSuccess: () => {
          setEditPipeline(null);
          setNewName("");
          setEditStages([]);
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
    });
    setNewName(p.name);
    setEditStages(
      p.stages.map((s, i) => ({
        id: s.id,
        name: s.name,
        order: i,
        probability: s.probability ?? 0,
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
              setCreateStages([
                { id: crypto.randomUUID(), name: "", order: 0, probability: 0 },
              ]);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> New Pipeline
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : pipelines.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">
              No pipelines yet. Create one to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Stages</TableHead>
                  <TableHead className="w-24">Default</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pipelines.map((p) => (
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
                        >
                          <Pencil className="h-3.5 w-3.5" />
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
              <label className="text-sm font-medium">Pipeline Name</label>
              <Input
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
                createStages.filter((s) => s.name.trim()).length === 0
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
              <label className="text-sm font-medium">Pipeline Name</label>
              <Input
                placeholder="Pipeline name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Stages</label>
              <StageBuilder stages={editStages} onChange={setEditStages} />
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
                editStages.filter((s) => s.name.trim()).length === 0
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
}: ListSettingsProps) {
  const [newName, setNewName] = useState("");
  const [editItem, setEditItem] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [editName, setEditName] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd(newName.trim());
    setNewName("");
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
        {/* Add row */}
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
            <Plus className="h-4 w-4 mr-1" />
            {isCreating ? "Adding..." : "Add"}
          </Button>
        </div>

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
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onDelete(item.id)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

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

// ── Source Settings ───────────────────────────────────────────────────────────

function SourceSettings() {
  const { data, isLoading } = useCrmSources();
  const createMutation = useCreateCrmSource();
  const updateMutation = useUpdateCrmSource();
  const deleteMutation = useDeleteCrmSource();

  const sources: CrmSource[] = data?.sources ?? [];

  return (
    <ListSettings
      title="Contact Sources"
      description="Define where your contacts come from. These appear as options when creating or editing a contact."
      emptyIcon={<Tag className="h-8 w-8" />}
      emptyText="No sources yet. Add one above."
      placeholder="e.g. Website, Referral, Social Media, Walk-in"
      items={sources}
      isLoading={isLoading}
      isCreating={createMutation.isPending}
      isUpdating={updateMutation.isPending}
      isDeleting={deleteMutation.isPending}
      onAdd={(name) => createMutation.mutate(name)}
      onUpdate={(id, name) => updateMutation.mutate({ id, name })}
      onDelete={(id) => deleteMutation.mutate(id)}
    />
  );
}

// ── Journey Type Settings ─────────────────────────────────────────────────────

function JourneyTypeSettings() {
  const { data, isLoading } = useCrmJourneyTypes();
  const createMutation = useCreateCrmJourneyType();
  const updateMutation = useUpdateCrmJourneyType();
  const deleteMutation = useDeleteCrmJourneyType();

  const journeyTypes: CrmJourneyType[] = data?.journeyTypes ?? [];

  return (
    <ListSettings
      title="Journey Types"
      description="Define the stages of your customer journey. These appear as options when creating or editing a contact."
      emptyIcon={<Route className="h-8 w-8" />}
      emptyText="No journey types yet. Add one above."
      placeholder="e.g. Prospecting, Qualified, Proposal, Negotiation, Closed"
      items={journeyTypes}
      isLoading={isLoading}
      isCreating={createMutation.isPending}
      isUpdating={updateMutation.isPending}
      isDeleting={deleteMutation.isPending}
      onAdd={(name) => createMutation.mutate(name)}
      onUpdate={(id, name) => updateMutation.mutate({ id, name })}
      onDelete={(id) => deleteMutation.mutate(id)}
    />
  );
}

// ── Tag Settings ──────────────────────────────────────────────────────────────

function TagSettings() {
  const { data, isLoading } = useContactTags();
  const createMutation = useCreateContactTag();
  const updateMutation = useUpdateContactTag();
  const deleteMutation = useDeleteContactTag();

  const tags = (data?.tags ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    createdAt: t.createdAt ?? new Date().toISOString(),
  }));

  return (
    <ListSettings
      title="Contact Tags"
      description="Create tags to categorize contacts. Tags appear when creating or editing a contact."
      emptyIcon={<Tags className="h-8 w-8" />}
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
    />
  );
}
