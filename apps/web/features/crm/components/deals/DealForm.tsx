"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePipelines } from "../../hooks/use-pipelines";
import { useContactsPaginated } from "../../hooks/use-contacts";
import { useCompaniesForSelect } from "../../hooks/use-companies";
import { useUsers } from "@/features/users";
import type {
  CreateDealData,
  UpdateDealData,
} from "../../services/deal.service";

// ── Schemas ───────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  value: z.coerce.number().min(0),
  stage: z.string().optional(),
  probability: z.coerce
    .number()
    .min(0, "Probability must be at least 0")
    .max(100, "Probability must be between 0 and 100")
    .optional(),
  pipelineId: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  assignedToId: z.string().optional(),
});

const editSchema = createSchema.extend({
  stage: z.string(),
  probability: z.coerce
    .number()
    .min(0, "Probability must be at least 0")
    .max(100, "Probability must be between 0 and 100"),
  status: z.enum(["OPEN", "WON", "LOST"]),
});

type EditFormValues = z.infer<typeof editSchema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface DealFormCreateProps {
  mode: "create";
  initialPipelineId?: string;
  onSubmit: (data: CreateDealData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface DealFormEditProps {
  mode: "edit";
  defaultValues: {
    name: string;
    value: number;
    stage: string;
    probability: number;
    expectedCloseDate?: string;
    status: "OPEN" | "WON" | "LOST";
    contactId?: string;
    companyId?: string;
    assignedToId: string;
    stageNames: string[];
  };
  onSubmit: (data: UpdateDealData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

type DealFormProps = DealFormCreateProps | DealFormEditProps;

// ── Component ─────────────────────────────────────────────────────────────────

export function DealForm(props: DealFormProps) {
  const { data: pipelinesData } = usePipelines();
  const { data: contactsData } = useContactsPaginated({ limit: 200 });
  const { data: companiesData } = useCompaniesForSelect();
  const { data: usersResult } = useUsers({ limit: 500 });

  const pipelines = useMemo(
    () => pipelinesData?.pipelines ?? [],
    [pipelinesData?.pipelines],
  );
  const defaultPipeline = pipelines.find((p) => p.isDefault) ?? pipelines[0];
  const contacts = contactsData?.data ?? [];
  const companies = companiesData?.companies ?? [];
  const users = usersResult?.users ?? [];

  const isEdit = props.mode === "edit";

  const form = useForm<EditFormValues>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: isEdit
      ? {
          name: props.defaultValues.name,
          value: props.defaultValues.value,
          stage: props.defaultValues.stage,
          probability: props.defaultValues.probability,
          expectedCloseDate: props.defaultValues.expectedCloseDate ?? "",
          status: props.defaultValues.status,
          contactId: props.defaultValues.contactId ?? "",
          companyId: props.defaultValues.companyId ?? "",
          assignedToId: props.defaultValues.assignedToId,
        }
      : {
          name: "",
          value: 0,
          probability: 0,
          pipelineId:
            (props.mode === "create" && "initialPipelineId" in props
              ? props.initialPipelineId
              : undefined) ??
            defaultPipeline?.id ??
            "",
        },
  });

  const stageNames = isEdit
    ? props.defaultValues.stageNames
    : (defaultPipeline?.stages?.map((s) => s.name) ?? []);

  const initialPipelineId =
    props.mode === "create" && "initialPipelineId" in props
      ? props.initialPipelineId
      : undefined;

  useEffect(() => {
    if (isEdit || pipelines.length === 0) return;
    const current = form.getValues("pipelineId");
    if (current) return;
    const fallback = defaultPipeline?.id ?? pipelines[0]?.id ?? "";
    form.setValue("pipelineId", initialPipelineId ?? fallback);
  }, [isEdit, pipelines, defaultPipeline?.id, initialPipelineId, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    if (props.mode === "create") {
      await props.onSubmit({
        name: values.name,
        value: values.value,
        stage: values.stage,
        probability: values.probability ?? 0,
        expectedCloseDate: values.expectedCloseDate || undefined,
        contactId: values.contactId || undefined,
        companyId: values.companyId || undefined,
        assignedToId: values.assignedToId || undefined,
        pipelineId: values.pipelineId || defaultPipeline?.id || undefined,
      });
    } else {
      await props.onSubmit({
        name: values.name,
        value: values.value,
        stage: values.stage,
        probability: values.probability,
        expectedCloseDate: values.expectedCloseDate || null,
        status: values.status,
        contactId: values.contactId || null,
        companyId: values.companyId || null,
        assignedToId: values.assignedToId,
      });
    }
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6">
      <div>
        <Label>Name *</Label>
        <Input {...form.register("name")} className="mt-1" />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Value</Label>
          <Input
            type="number"
            {...form.register("value")}
            className="mt-1"
            min={0}
          />
        </div>
        <div>
          <Label>Probability (%)</Label>
          <Input
            type="number"
            {...form.register("probability")}
            className="mt-1"
            min={0}
            max={100}
          />
        </div>
      </div>

      {isEdit && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Stage</Label>
            <Select
              value={form.watch("stage") ?? ""}
              onValueChange={(v) => form.setValue("stage", v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {stageNames.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={form.watch("status") ?? "OPEN"}
              onValueChange={(v) =>
                form.setValue("status", v as "OPEN" | "WON" | "LOST")
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="WON">Won</SelectItem>
                <SelectItem value="LOST">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {!isEdit && pipelines.length > 0 && (
        <div>
          <Label>Pipeline</Label>
          <Select
            value={form.watch("pipelineId") || ""}
            onValueChange={(v) => form.setValue("pipelineId", v || undefined)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select pipeline" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  {p.isDefault ? " (default)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label>Expected Close Date</Label>
        <Input
          type="date"
          {...form.register("expectedCloseDate")}
          className="mt-1"
        />
      </div>

      <div>
        <Label>Contact</Label>
        <Select
          value={form.watch("contactId") || "__none__"}
          onValueChange={(v) =>
            form.setValue("contactId", v === "__none__" ? undefined : v)
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select contact" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {contacts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.firstName} {c.lastName || ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Company</Label>
        <Select
          value={form.watch("companyId") || "__none__"}
          onValueChange={(v) =>
            form.setValue("companyId", v === "__none__" ? undefined : v)
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Assign To</Label>
        <Select
          value={form.watch("assignedToId") || "__none__"}
          onValueChange={(v) =>
            form.setValue("assignedToId", v === "__none__" ? undefined : v)
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select user" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Unassigned</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={props.isLoading}>
          {props.isLoading
            ? isEdit
              ? "Saving..."
              : "Creating..."
            : isEdit
              ? "Save Changes"
              : "Create Deal"}
        </Button>
        <Button type="button" variant="outline" onClick={props.onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
