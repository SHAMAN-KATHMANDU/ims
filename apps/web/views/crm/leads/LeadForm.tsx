"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUsers } from "@/hooks/useUser";
import type { CreateLeadData } from "@/services/leadService";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  status: z
    .enum(["NEW", "CONTACTED", "QUALIFIED", "LOST", "CONVERTED"])
    .optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  assignedToId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface LeadFormProps {
  defaultValues?: Partial<CreateLeadData>;
  onSubmit: (data: CreateLeadData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function LeadForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading,
}: LeadFormProps) {
  const { data: usersResult } = useUsers({ limit: 500 });
  const users = usersResult?.users ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      companyName: defaultValues?.companyName ?? "",
      status: defaultValues?.status ?? "NEW",
      source: defaultValues?.source ?? "",
      notes: defaultValues?.notes ?? "",
      assignedToId: defaultValues?.assignedToId ?? "",
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit(async (v) => {
        await onSubmit({
          name: v.name,
          email: v.email || undefined,
          phone: v.phone?.trim() || undefined,
          companyName: v.companyName || undefined,
          status: v.status as CreateLeadData["status"],
          source: v.source || undefined,
          notes: v.notes || undefined,
          assignedToId: v.assignedToId || undefined,
        });
      })}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="name">Name *</Label>
        <Input id="name" {...form.register("name")} className="mt-1" />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...form.register("email")}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="lead-phone">Phone</Label>
        <PhoneInput
          value={form.watch("phone") ?? ""}
          onChange={(e164) => form.setValue("phone", e164 || undefined)}
          placeholder="e.g. 9841234567"
          numberInputId="lead-phone"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="companyName">Company</Label>
        <Input
          id="companyName"
          {...form.register("companyName")}
          className="mt-1"
        />
      </div>
      <div>
        <Label>Status</Label>
        <Select
          value={form.watch("status")}
          onValueChange={(v) =>
            form.setValue("status", v as FormValues["status"])
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["NEW", "CONTACTED", "QUALIFIED", "LOST", "CONVERTED"].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="source">Source</Label>
        <Input
          id="source"
          {...form.register("source")}
          className="mt-1"
          placeholder="e.g. Website, Referral"
        />
      </div>
      <div>
        <Label>Assign To</Label>
        <Select
          value={form.watch("assignedToId") || ""}
          onValueChange={(v) => form.setValue("assignedToId", v)}
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
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...form.register("notes")}
          className="mt-1"
          rows={3}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
