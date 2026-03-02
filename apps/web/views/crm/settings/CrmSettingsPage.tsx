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
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  usePipelines,
  useCreatePipeline,
  useUpdatePipeline,
  useDeletePipeline,
} from "@/hooks/usePipelines";
import {
  useCrmSources,
  useCreateCrmSource,
  useUpdateCrmSource,
  useDeleteCrmSource,
} from "@/hooks/useCrmSettings";
import type { PipelineStage } from "@/services/pipelineService";
import type { CrmSource } from "@/services/crmSettingsService";

export default function CrmSettingsPage() {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold">CRM Settings</h1>
        <p className="text-muted-foreground">
          Manage pipelines and contact sources
        </p>
      </div>
      <PipelineSettings />
      <SourceSettings />
    </div>
  );
}

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
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Pipeline Settings</CardTitle>
          <CardDescription>
            Manage deal pipelines and their stages
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
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Stages</TableHead>
                <TableHead>Default</TableHead>
                <TableHead className="w-24">Actions</TableHead>
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
                    {p.isDefault ? <Badge>Default</Badge> : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(p.id)}
                        disabled={p.isDefault}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Pipeline name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Input
              placeholder="Stages (comma-separated, e.g. Qualification, Proposal, Closing)"
              value={stagesText}
              onChange={(e) => setStagesText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          <div className="space-y-3">
            <Input
              placeholder="Pipeline name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Input
              placeholder="Stages (comma-separated)"
              value={stagesText}
              onChange={(e) => setStagesText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPipeline(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SourceSettings() {
  const { data, isLoading } = useCrmSources();
  const createMutation = useCreateCrmSource();
  const updateMutation = useUpdateCrmSource();
  const deleteMutation = useDeleteCrmSource();

  const [newSourceName, setNewSourceName] = useState("");
  const [editSource, setEditSource] = useState<CrmSource | null>(null);
  const [editName, setEditName] = useState("");

  const sources = data?.sources ?? [];

  const handleCreate = () => {
    if (!newSourceName.trim()) return;
    createMutation.mutate(newSourceName.trim(), {
      onSuccess: () => setNewSourceName(""),
    });
  };

  const handleUpdate = () => {
    if (!editSource || !editName.trim()) return;
    updateMutation.mutate(
      { id: editSource.id, name: editName.trim() },
      { onSuccess: () => setEditSource(null) },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Sources</CardTitle>
        <CardDescription>
          Define where your contacts come from (e.g. Website, Referral, Social
          Media)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="New source name"
            value={newSourceName}
            onChange={(e) => setNewSourceName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending || !newSourceName.trim()}
          >
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source Name</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditSource(s);
                          setEditName(s.name);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(s.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sources.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="text-center text-muted-foreground py-6"
                  >
                    No sources yet. Add one above.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog
        open={!!editSource}
        onOpenChange={(open) => {
          if (!open) setEditSource(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Source</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Source name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSource(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
