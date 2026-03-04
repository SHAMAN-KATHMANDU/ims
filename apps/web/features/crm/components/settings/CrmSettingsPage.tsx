"use client";

import { useState } from "react";
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
import { Pencil, Plus, Trash2, GitBranch, Tag, Route } from "lucide-react";
import {
  usePipelines,
  useCreatePipeline,
  useUpdatePipeline,
  useDeletePipeline,
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
      </Tabs>
    </div>
  );
}

// ── Pipeline Settings ─────────────────────────────────────────────────────────

function PipelineSettings() {
  const { data, isLoading } = usePipelines();
  const createMutation = useCreatePipeline();
  const updateMutation = useUpdatePipeline();
  const deleteMutation = useDeletePipeline();

  const [showCreate, setShowCreate] = useState(false);
  const [editPipeline, setEditPipeline] = useState<{
    id: string;
    name: string;
    stages: PipelineStage[];
    isDefault: boolean;
  } | null>(null);
  const [newName, setNewName] = useState("");
  const [stagesText, setStagesText] = useState("");

  const pipelines = data?.pipelines ?? [];

  const handleCreate = () => {
    if (!newName.trim()) return;
    const stages: PipelineStage[] = stagesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name, i) => ({ id: crypto.randomUUID(), name, order: i }));
    createMutation.mutate(
      { name: newName.trim(), stages },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewName("");
          setStagesText("");
        },
      },
    );
  };

  const handleUpdate = () => {
    if (!editPipeline) return;
    const stages: PipelineStage[] = stagesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name, i) => ({ id: crypto.randomUUID(), name, order: i }));
    updateMutation.mutate(
      {
        id: editPipeline.id,
        data: { name: newName.trim() || editPipeline.name, stages },
      },
      {
        onSuccess: () => {
          setEditPipeline(null);
          setNewName("");
          setStagesText("");
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
    setStagesText(p.stages.map((s) => s.name).join(", "));
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
        <Button
          size="sm"
          onClick={() => {
            setShowCreate(true);
            setNewName("");
            setStagesText("");
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> New Pipeline
        </Button>
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
                    <TableCell className="font-medium">{p.name}</TableCell>
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
        <DialogContent>
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
              <Input
                placeholder="e.g. Qualification, Proposal, Negotiation, Closing"
                value={stagesText}
                onChange={(e) => setStagesText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Separate stage names with commas
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || createMutation.isPending}
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
        <DialogContent>
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
              <Input
                placeholder="Comma-separated stage names"
                value={stagesText}
                onChange={(e) => setStagesText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Separate stage names with commas
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPipeline(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
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
        <DialogContent>
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
