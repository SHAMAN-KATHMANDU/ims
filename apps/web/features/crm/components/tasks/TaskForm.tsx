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
import { useUsers } from "@/features/users";
import type {
  CreateTaskData,
  UpdateTaskData,
} from "../../services/task.service";
import { useEnvFeatureFlag } from "@/features/flags";
import { EnvFeature } from "@/features/flags";

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  dueDate: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  assignedToId: z.string().optional(),
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
    assignedToId?: string;
  };
  onSubmit: (data: UpdateTaskData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

type TaskFormProps = TaskFormCreateProps | TaskFormEditProps;

// ── Component ─────────────────────────────────────────────────────────────────

export function TaskForm(props: TaskFormProps) {
  const dealsEnabled = useEnvFeatureFlag(EnvFeature.CRM_DEALS);
  const { data: contactsData } = useContactsPaginated({ limit: 100 });
  const { data: dealsData } = useDealsPaginated(
    { limit: 100 },
    { enabled: dealsEnabled },
  );
  const { data: usersResult } = useUsers({ limit: 10 });

  const contacts = contactsData?.data ?? [];
  const deals = dealsData?.data ?? [];
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
          assignedToId: props.defaultValues.assignedToId ?? "",
        }
      : {
          title: "",
          dealId: props.defaultDealId ?? "",
          contactId: props.defaultContactId ?? "",
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
        assignedToId: emptyToUndefined(values.assignedToId),
      });
    } else {
      await props.onSubmit({
        title: values.title.trim(),
        dueDate: emptyToNull(values.dueDate),
        contactId: emptyToNull(values.contactId),
        dealId: emptyToNull(values.dealId),
        assignedToId: emptyToUndefined(values.assignedToId),
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
