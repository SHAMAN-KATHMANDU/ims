"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { useCompaniesForSelect } from "@/hooks/useCompanies";
import { useContactTags } from "@/hooks/useContacts";
import { useMembersPaginated } from "@/hooks/useMember";
import type { CreateContactData } from "@/services/contactService";

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  companyId: z.string().optional(),
  memberId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof schema>;

interface ContactFormProps {
  defaultValues?: Partial<CreateContactData>;
  onSubmit: (data: CreateContactData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ContactForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading,
}: ContactFormProps) {
  const { data: companiesData } = useCompaniesForSelect();
  const { data: tagsData } = useContactTags();
  const { data: membersData } = useMembersPaginated({ limit: 500 });
  const companies = companiesData?.companies ?? [];
  const tags = tagsData?.tags ?? [];
  const members = membersData?.data ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: defaultValues?.firstName ?? "",
      lastName: defaultValues?.lastName ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      companyId: defaultValues?.companyId ?? "",
      memberId: defaultValues?.memberId ?? "",
      tagIds: defaultValues?.tagIds ?? [],
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit({
          firstName: values.firstName,
          lastName: values.lastName || undefined,
          email: values.email || undefined,
          phone: values.phone || undefined,
          companyId: values.companyId || undefined,
          memberId: values.memberId || undefined,
          tagIds: values.tagIds,
        });
      })}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            {...form.register("firstName")}
            className="mt-1"
          />
          {form.formState.errors.firstName && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.firstName.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            {...form.register("lastName")}
            className="mt-1"
          />
        </div>
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
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" {...form.register("phone")} className="mt-1" />
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
        <Label>Member (link to existing)</Label>
        <Select
          value={form.watch("memberId") || "__none__"}
          onValueChange={(v) =>
            form.setValue("memberId", v === "__none__" ? undefined : v)
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select member" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name ? `${m.name} (${m.phone})` : m.phone}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {tags.length > 0 && (
        <div>
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {tags.map((tag) => {
              const current = form.watch("tagIds") ?? [];
              const checked = current.includes(tag.id);
              return (
                <label
                  key={tag.id}
                  className="flex items-center gap-1.5 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...current, tag.id]
                        : current.filter((id) => id !== tag.id);
                      form.setValue("tagIds", next);
                    }}
                    className="rounded"
                  />
                  {tag.name}
                </label>
              );
            })}
          </div>
        </div>
      )}
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
