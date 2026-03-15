"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
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
import { Plus, Trash2 } from "lucide-react";
import {
  CreateWorkflowFormSchema,
  UpdateWorkflowFormSchema,
  type CreateWorkflowFormValues,
  type UpdateWorkflowFormValues,
} from "../../validation";
import type {
  WorkflowTrigger,
  WorkflowAction,
} from "../../services/workflow.service";

export interface PipelineStageOption {
  id: string;
  name: string;
}

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

interface PipelineOption {
  id: string;
  name: string;
  stages?: PipelineStageOption[];
}

interface WorkflowFormCreateProps {
  mode: "create";
  pipelines: PipelineOption[];
  onSubmit: (data: CreateWorkflowFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

interface WorkflowFormEditProps {
  mode: "edit";
  pipelines: PipelineOption[];
  stages: PipelineStageOption[];
  defaultValues: UpdateWorkflowFormValues;
  onSubmit: (data: UpdateWorkflowFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

type WorkflowFormProps = WorkflowFormCreateProps | WorkflowFormEditProps;

const DEFAULT_ACTION_CONFIG: Partial<
  Record<WorkflowAction, Record<string, unknown>>
> = {
  CREATE_TASK: { taskTitle: "Follow up", dueDateDays: 1 },
  SEND_NOTIFICATION: { title: "", message: "" },
  MOVE_STAGE: { targetStageId: "" },
  UPDATE_FIELD: { field: "probability", value: 0 },
  CREATE_ACTIVITY: { type: "CALL", subject: "", notes: null },
};

export function WorkflowForm(props: WorkflowFormProps) {
  const isEdit = props.mode === "edit";
  const schema = isEdit ? UpdateWorkflowFormSchema : CreateWorkflowFormSchema;
  const form = useForm<CreateWorkflowFormValues | UpdateWorkflowFormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: isEdit
      ? props.defaultValues
      : {
          pipelineId: "",
          name: "",
          isActive: true,
          rules: [],
        },
  });

  const selectedPipelineId = form.watch("pipelineId");
  const stages: PipelineStageOption[] = isEdit
    ? (props as WorkflowFormEditProps).stages
    : (props.pipelines.find((p) => p.id === selectedPipelineId)?.stages ?? []);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "rules",
  });

  const handleSubmit = form.handleSubmit((data) => {
    if (isEdit) {
      props.onSubmit(data as UpdateWorkflowFormValues);
    } else {
      props.onSubmit(data as CreateWorkflowFormValues);
    }
  });

  const addRule = () => {
    append({
      trigger: "STAGE_ENTER",
      action: "CREATE_TASK",
      actionConfig: { taskTitle: "Follow up", dueDateDays: 1 },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          placeholder="e.g. Follow-up automation"
          aria-invalid={!!form.formState.errors.name}
          {...form.register("name")}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      {!isEdit && (
        <div className="space-y-2">
          <Label htmlFor="pipelineId">Pipeline</Label>
          <Select
            value={form.watch("pipelineId")}
            onValueChange={(v) => form.setValue("pipelineId", v)}
          >
            <SelectTrigger id="pipelineId">
              <SelectValue placeholder="Select pipeline" />
            </SelectTrigger>
            <SelectContent>
              {props.pipelines.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isEdit &&
            "pipelineId" in form.formState.errors &&
            form.formState.errors.pipelineId && (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.pipelineId.message}
              </p>
            )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Switch
          id="active"
          checked={form.watch("isActive")}
          onCheckedChange={(v) => form.setValue("isActive", v)}
        />
        <Label htmlFor="active">Active</Label>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Rules</Label>
          <Button type="button" size="sm" variant="outline" onClick={addRule}>
            <Plus className="h-3 w-3 mr-1" /> Add rule
          </Button>
        </div>
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No rules. Add a rule to trigger actions on deal events.
          </p>
        ) : (
          <div className="space-y-2">
            {fields.map((field, i) => {
              const action = form.watch(`rules.${i}.action`);
              const actionConfig = form.watch(`rules.${i}.actionConfig`) ?? {};
              const updateConfig = (key: string, value: unknown) => {
                form.setValue(`rules.${i}.actionConfig`, {
                  ...actionConfig,
                  [key]: value,
                });
              };
              return (
                <div
                  key={field.id}
                  className="space-y-2 p-2 border rounded bg-muted/30"
                >
                  <div className="flex flex-wrap gap-2 items-center">
                    <Select
                      value={form.watch(`rules.${i}.trigger`)}
                      onValueChange={(v) =>
                        form.setValue(
                          `rules.${i}.trigger`,
                          v as WorkflowTrigger,
                        )
                      }
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(TRIGGER_LABELS) as WorkflowTrigger[]).map(
                          (t) => (
                            <SelectItem key={t} value={t}>
                              {TRIGGER_LABELS[t]}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    {(form.watch(`rules.${i}.trigger`) === "STAGE_ENTER" ||
                      form.watch(`rules.${i}.trigger`) === "STAGE_EXIT") && (
                      <Select
                        value={
                          (form.watch(`rules.${i}.triggerStageId`) as string) ??
                          "__any__"
                        }
                        onValueChange={(v) =>
                          form.setValue(
                            `rules.${i}.triggerStageId`,
                            v === "__any__" ? null : v,
                          )
                        }
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder="Stage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__any__">Any stage</SelectItem>
                          {stages.map((s) => (
                            <SelectItem key={s.id} value={s.name}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <span className="text-muted-foreground">→</span>
                    <Select
                      value={action}
                      onValueChange={(v) => {
                        const newAction = v as WorkflowAction;
                        form.setValue(`rules.${i}.action`, newAction);
                        form.setValue(
                          `rules.${i}.actionConfig`,
                          DEFAULT_ACTION_CONFIG[newAction] ?? {},
                        );
                      }}
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
                      onClick={() => remove(i)}
                      aria-label="Remove rule"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  {/* Per-action config fields */}
                  {action === "CREATE_TASK" && (
                    <div className="flex flex-wrap gap-2 items-center pl-2 text-sm">
                      <Label className="sr-only">Task title</Label>
                      <Input
                        placeholder="Task title"
                        className="h-8 w-40"
                        value={(actionConfig.taskTitle as string) ?? ""}
                        onChange={(e) =>
                          updateConfig("taskTitle", e.target.value || undefined)
                        }
                      />
                      <Label className="sr-only">Due in days</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Due in days"
                        className="h-8 w-24"
                        value={(actionConfig.dueDateDays as number) ?? ""}
                        onChange={(e) =>
                          updateConfig(
                            "dueDateDays",
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                      />
                    </div>
                  )}
                  {action === "SEND_NOTIFICATION" && (
                    <div className="flex flex-wrap gap-2 items-center pl-2 text-sm">
                      <Input
                        placeholder="Title"
                        className="h-8 w-36"
                        value={(actionConfig.title as string) ?? ""}
                        onChange={(e) =>
                          updateConfig("title", e.target.value || undefined)
                        }
                      />
                      <Input
                        placeholder="Message"
                        className="h-8 flex-1 min-w-32"
                        value={(actionConfig.message as string) ?? ""}
                        onChange={(e) =>
                          updateConfig("message", e.target.value || undefined)
                        }
                      />
                    </div>
                  )}
                  {action === "MOVE_STAGE" && (
                    <div className="pl-2 text-sm">
                      <Select
                        value={(actionConfig.targetStageId as string) ?? ""}
                        onValueChange={(v) =>
                          updateConfig("targetStageId", v || undefined)
                        }
                      >
                        <SelectTrigger className="h-8 w-48">
                          <SelectValue placeholder="Select target stage" />
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map((s) => (
                            <SelectItem key={s.id} value={s.name}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {action === "UPDATE_FIELD" && (
                    <div className="flex flex-wrap gap-2 items-center pl-2 text-sm">
                      <Select
                        value={(actionConfig.field as string) ?? ""}
                        onValueChange={(v) => updateConfig("field", v)}
                      >
                        <SelectTrigger className="h-8 w-36">
                          <SelectValue placeholder="Field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="probability">
                            Probability
                          </SelectItem>
                          <SelectItem value="expectedCloseDate">
                            Expected close date
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Value"
                        className="h-8 w-28"
                        value={
                          (actionConfig.value as string | number)?.toString() ??
                          ""
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          const num = Number(v);
                          updateConfig(
                            "value",
                            Number.isFinite(num) ? num : v || undefined,
                          );
                        }}
                      />
                    </div>
                  )}
                  {action === "CREATE_ACTIVITY" && (
                    <div className="flex flex-wrap gap-2 items-center pl-2 text-sm">
                      <Select
                        value={(actionConfig.type as string) ?? "CALL"}
                        onValueChange={(v) => updateConfig("type", v)}
                      >
                        <SelectTrigger className="h-8 w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CALL">Call</SelectItem>
                          <SelectItem value="EMAIL">Email</SelectItem>
                          <SelectItem value="MEETING">Meeting</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Subject"
                        className="h-8 w-36"
                        value={(actionConfig.subject as string) ?? ""}
                        onChange={(e) =>
                          updateConfig("subject", e.target.value || undefined)
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={props.onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={props.isSubmitting || form.formState.isSubmitting}
        >
          {props.isSubmitting || form.formState.isSubmitting
            ? "Saving…"
            : isEdit
              ? "Save"
              : "Create"}
        </Button>
      </div>
    </form>
  );
}
