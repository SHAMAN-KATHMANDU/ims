"use client";

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
import { useContactsPaginated } from "../../hooks/use-contacts";
import { useDealsPaginated } from "../../hooks/use-deals";
import { useCompaniesForSelect } from "../../hooks/use-companies";
import { useUsers } from "@/features/users";
import type {
  CreateTaskData,
  UpdateTaskData,
} from "../../services/task.service";
import { useEnvFeatureFlag, useFeatureFlag } from "@/features/flags";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  dueDate: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  companyId: z.string().optional(),
  assignedToId: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface TaskFormCreateProps {
  mode: "create";
  defaultDealId?: string;
  defaultContactId?: string;
  onSubmit: (data: CreateTaskData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface TaskFormEditProps {
  mode: "edit";
  defaultValues: {
    title: string;
    dueDate?: string;
    contactId?: string;
    dealId?: string;
    companyId?: string;
    assignedToId?: string;
    priority?: "LOW" | "MEDIUM" | "HIGH";
    status?: "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";
  };
  onSubmit: (data: UpdateTaskData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

type TaskFormProps = TaskFormCreateProps | TaskFormEditProps;

// ── Component ─────────────────────────────────────────────────────────────────

export function TaskForm(props: TaskFormProps) {
  const envDealsEnabled = useEnvFeatureFlag(EnvFeature.CRM_DEALS);
  const salesPipelinePlan = useFeatureFlag(Feature.SALES_PIPELINE);
  const dealsEnabled = envDealsEnabled && salesPipelinePlan;
  const { data: contactsData } = useContactsPaginated({ limit: 100 });
  const { data: dealsData } = useDealsPaginated(
    { limit: 100 },
    { enabled: dealsEnabled },
  );
  const { data: companiesData } = useCompaniesForSelect();
  const { data: usersResult } = useUsers({ limit: 10 });

  const contacts = contactsData?.data ?? [];
  const deals = dealsData?.data ?? [];
  const companies = companiesData?.companies ?? [];
  const users = usersResult?.users ?? [];

  const isEdit = props.mode === "edit";

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: isEdit
      ? {
          title: props.defaultValues.title,
          dueDate: props.defaultValues.dueDate ?? "",
          contactId: props.defaultValues.contactId ?? "",
          dealId: props.defaultValues.dealId ?? "",
          companyId: props.defaultValues.companyId ?? "",
          assignedToId: props.defaultValues.assignedToId ?? "",
          priority: props.defaultValues.priority ?? "MEDIUM",
          status: props.defaultValues.status ?? "OPEN",
        }
      : {
          title: "",
          dealId: props.defaultDealId ?? "",
          contactId: props.defaultContactId ?? "",
          companyId: "",
          priority: "MEDIUM",
          status: "OPEN",
        },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    const emptyToUndefined = (v: string | undefined) =>
      v == null || v.trim() === "" ? undefined : v;
    const emptyToNull = (v: string | undefined) =>
      v == null || v.trim() === "" ? null : v;

    if (props.mode === "create") {
      await props.onSubmit({
        title: values.title,
        dueDate: emptyToUndefined(values.dueDate),
        contactId: emptyToUndefined(values.contactId),
        dealId: dealsEnabled ? emptyToUndefined(values.dealId) : undefined,
        companyId: emptyToNull(values.companyId),
        assignedToId: emptyToUndefined(values.assignedToId),
        priority: values.priority,
        status: values.status,
      });
    } else {
      await props.onSubmit({
        title: values.title.trim(),
        dueDate: emptyToNull(values.dueDate),
        contactId: emptyToNull(values.contactId),
        dealId: emptyToNull(values.dealId),
        companyId: emptyToNull(values.companyId),
        assignedToId: emptyToUndefined(values.assignedToId),
        priority: values.priority,
        status: values.status,
      });
    }
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6">
      <div>
        <Label>Title *</Label>
        <Input {...form.register("title")} className="mt-1" />
        {form.formState.errors.title && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.title.message}
          </p>
        )}
      </div>

      <div>
        <Label>Due Date</Label>
        <Input type="date" {...form.register("dueDate")} className="mt-1" />
      </div>

      <div>
        <Label>Assign To</Label>
        <Select
          value={form.watch("assignedToId") || ""}
          onValueChange={(v) =>
            form.setValue("assignedToId", v ? v : undefined)
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select user" />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Contact</Label>
        <Select
          value={form.watch("contactId") ?? "__none__"}
          onValueChange={(v) =>
            form.setValue("contactId", v === "__none__" ? undefined : v)
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select contact" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">—</SelectItem>
            {contacts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.firstName} {c.lastName || ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {dealsEnabled && (
        <div>
          <Label>Deal</Label>
          <Select
            value={form.watch("dealId") ?? "__none__"}
            onValueChange={(v) =>
              form.setValue("dealId", v === "__none__" ? undefined : v)
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select deal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {deals.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
            <SelectItem value="__none__">—</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Priority</Label>
          <Select
            value={form.watch("priority") ?? "MEDIUM"}
            onValueChange={(v) =>
              form.setValue("priority", v as "LOW" | "MEDIUM" | "HIGH")
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isEdit && (
          <div>
            <Label>Status</Label>
            <Select
              value={form.watch("status") ?? "OPEN"}
              onValueChange={(v) =>
                form.setValue(
                  "status",
                  v as "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED",
                )
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                <SelectItem value="DONE">Done</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={props.isLoading}>
          {props.isLoading
            ? isEdit
              ? "Saving..."
              : "Creating..."
            : isEdit
              ? "Save Changes"
              : "Create Task"}
        </Button>
        <Button type="button" variant="outline" onClick={props.onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
