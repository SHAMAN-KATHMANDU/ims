"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Zap } from "lucide-react";
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
  CreateWorkflowRuleInput,
} from "../../services/workflow.service";

const TRIGGER_LABELS: Record<WorkflowTrigger, string> = {
  STAGE_ENTER: "Stage enter",
  STAGE_EXIT: "Stage exit",
  DEAL_CREATED: "Deal created",
  DEAL_WON: "Deal won",
  DEAL_LOST: "Deal lost",
};

const ACTION_LABELS: Record<WorkflowAction, string> = {
  CREATE_TASK: "Create task",
  SEND_NOTIFICATION: "Send notification",
  MOVE_STAGE: "Move stage",
  UPDATE_FIELD: "Update field",
  CREATE_ACTIVITY: "Create activity",
};

export default function WorkflowEditorPage() {
  const { data, isLoading } = useWorkflows();
  const { data: pipelinesData } = usePipelines();
  const createMutation = useCreateWorkflow();
  const updateMutation = useUpdateWorkflow();
  const deleteMutation = useDeleteWorkflow();

  const [showCreate, setShowCreate] = useState(false);
  const [editWorkflow, setEditWorkflow] = useState<Workflow | null>(null);
  const [formName, setFormName] = useState("");
  const [formPipelineId, setFormPipelineId] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formRules, setFormRules] = useState<CreateWorkflowRuleInput[]>([]);

  const workflows = data?.workflows ?? [];
  const pipelines = pipelinesData?.pipelines ?? [];

  const resetFormFields = () => {
    setFormName("");
    setFormPipelineId("");
    setFormIsActive(true);
    setFormRules([]);
  };

  const resetForm = () => {
    resetFormFields();
    setShowCreate(false);
    setEditWorkflow(null);
  };

  const handleCreate = () => {
    if (!formName.trim() || !formPipelineId) return;
    createMutation.mutate(
      {
        pipelineId: formPipelineId,
        name: formName.trim(),
        isActive: formIsActive,
        rules: formRules.length > 0 ? formRules : undefined,
      },
      { onSuccess: resetForm },
    );
  };

  const handleUpdate = () => {
    if (!editWorkflow) return;
    updateMutation.mutate(
      {
        id: editWorkflow.id,
        data: {
          name: formName.trim() || editWorkflow.name,
          isActive: formIsActive,
          rules: formRules,
        },
      },
      { onSuccess: resetForm },
    );
  };

  const openEdit = (w: Workflow) => {
    setEditWorkflow(w);
    setFormName(w.name);
    setFormPipelineId(w.pipelineId);
    setFormIsActive(w.isActive);
    setFormRules(
      w.rules.map((r) => ({
        trigger: r.trigger,
        triggerStageId: r.triggerStageId,
        action: r.action,
        actionConfig: r.actionConfig ?? {},
        ruleOrder: r.ruleOrder,
      })),
    );
  };

  const addRule = () => {
    setFormRules((prev) => [
      ...prev,
      {
        trigger: "STAGE_ENTER" as WorkflowTrigger,
        action: "CREATE_TASK" as WorkflowAction,
        actionConfig: { taskTitle: "Follow up", dueDateDays: 1 },
      },
    ]);
  };

  const removeRule = (i: number) => {
    setFormRules((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateRule = (i: number, updates: Partial<CreateWorkflowRuleInput>) => {
    setFormRules((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...updates } : r)),
    );
  };

  const isFormValid = formName.trim() && (editWorkflow || formPipelineId);

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
              resetFormFields();
              setEditWorkflow(null);
              setShowCreate(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> New Workflow
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">
                No workflows yet. Create one to automate deal actions.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Pipeline</TableHead>
                    <TableHead>Rules</TableHead>
                    <TableHead className="w-24">Active</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflows.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{w.name}</TableCell>
                      <TableCell>{w.pipeline?.name ?? w.pipelineId}</TableCell>
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
                            onClick={() => openEdit(w)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(w.id)}
                            disabled={deleteMutation.isPending}
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
      </Card>

      {/* Create / Edit dialog */}
      <Dialog
        open={showCreate || !!editWorkflow}
        onOpenChange={(open) => !open && resetForm()}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editWorkflow ? "Edit Workflow" : "New Workflow"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Follow-up automation"
              />
            </div>
            {!editWorkflow && (
              <div className="space-y-2">
                <Label>Pipeline</Label>
                <Select
                  value={formPipelineId}
                  onValueChange={setFormPipelineId}
                >
                  <SelectTrigger>
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
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
              <Label htmlFor="active">Active</Label>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Rules</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addRule}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add rule
                </Button>
              </div>
              {formRules.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No rules. Add a rule to trigger actions on deal events.
                </p>
              ) : (
                <div className="space-y-2">
                  {formRules.map((rule, i) => (
                    <div
                      key={i}
                      className="flex flex-wrap gap-2 items-center p-2 border rounded bg-muted/30"
                    >
                      <Select
                        value={rule.trigger}
                        onValueChange={(v) =>
                          updateRule(i, { trigger: v as WorkflowTrigger })
                        }
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(
                            Object.keys(TRIGGER_LABELS) as WorkflowTrigger[]
                          ).map((t) => (
                            <SelectItem key={t} value={t}>
                              {TRIGGER_LABELS[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground">→</span>
                      <Select
                        value={rule.action}
                        onValueChange={(v) =>
                          updateRule(i, { action: v as WorkflowAction })
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ACTION_LABELS) as WorkflowAction[]).map(
                            (a) => (
                              <SelectItem key={a} value={a}>
                                {ACTION_LABELS[a]}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeRule(i)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button
              onClick={editWorkflow ? handleUpdate : handleCreate}
              disabled={
                !isFormValid ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {editWorkflow ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
