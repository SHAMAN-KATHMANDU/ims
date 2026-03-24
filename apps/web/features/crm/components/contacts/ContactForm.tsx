"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompaniesForSelect } from "../../hooks/use-companies";
import { useContactTags, useCreateContactTag } from "../../hooks/use-contacts";
import {
  useCrmSources,
  useCrmJourneyTypes,
} from "../../hooks/use-crm-settings";
import { useToast } from "@/hooks/useToast";
import type { CreateContactData } from "../../services/contact.service";
import { ContactProfileFieldsSchema } from "@repo/shared";

const schema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    companyId: z.string().optional(),
    tagIds: z.array(z.string()).optional(),
    source: z.string().optional(),
    journeyType: z.string().optional(),
  })
  .merge(ContactProfileFieldsSchema);

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
  const { toast } = useToast();
  const { data: companiesData } = useCompaniesForSelect();
  const { data: tagsData } = useContactTags();
  const createTagMutation = useCreateContactTag();
  const { data: sourcesData } = useCrmSources();
  const { data: journeyTypesData } = useCrmJourneyTypes();
  const companies = companiesData?.companies ?? [];
  const [optimisticTags, setOptimisticTags] = useState<
    Array<{ id: string; name: string }>
  >([]);
  useEffect(() => {
    if (!tagsData?.tags?.length) return;
    setOptimisticTags((prev) =>
      prev.filter((ot) => !tagsData.tags.some((t) => t.id === ot.id)),
    );
  }, [tagsData?.tags]);
  const displayTags = [
    ...(tagsData?.tags ?? []),
    ...optimisticTags.filter(
      (ot) => !(tagsData?.tags ?? []).some((t) => t.id === ot.id),
    ),
  ];
  const tags = displayTags;
  const sources = sourcesData?.sources ?? [];
  const journeyTypes = journeyTypesData?.journeyTypes ?? [];

  const toDateInput = (iso?: string | null) =>
    iso && iso.length >= 10 ? iso.slice(0, 10) : "";

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      firstName: defaultValues?.firstName ?? "",
      lastName: defaultValues?.lastName ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      gender: defaultValues?.gender ?? "",
      birthDate: toDateInput(defaultValues?.birthDate),
      companyId: defaultValues?.companyId ?? "",
      tagIds: defaultValues?.tagIds ?? [],
      source: defaultValues?.source ?? "",
      journeyType: defaultValues?.journeyType ?? "",
    },
  });

  const hasAppliedDefaults = useRef(false);
  useEffect(() => {
    if (!defaultValues) {
      hasAppliedDefaults.current = false;
      return;
    }
    if (hasAppliedDefaults.current) return;
    hasAppliedDefaults.current = true;
    form.reset({
      firstName: defaultValues.firstName ?? "",
      lastName: defaultValues.lastName ?? "",
      email: defaultValues.email ?? "",
      phone: defaultValues.phone ?? "",
      gender: defaultValues.gender ?? "",
      birthDate: toDateInput(defaultValues.birthDate),
      companyId: defaultValues.companyId ?? "",
      tagIds: defaultValues.tagIds ?? [],
      source: defaultValues.source ?? "",
      journeyType: defaultValues.journeyType ?? "",
    });
  }, [defaultValues, form]);

  return (
    <form
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit({
          firstName: values.firstName,
          lastName: values.lastName || undefined,
          email: values.email || undefined,
          phone: values.phone?.trim() || undefined,
          gender: values.gender?.trim() || null,
          birthDate: values.birthDate?.trim()
            ? new Date(values.birthDate.trim()).toISOString()
            : null,
          companyId: values.companyId || undefined,
          tagIds: values.tagIds,
          source: values.source || undefined,
          journeyType: values.journeyType || undefined,
        });
      })}
      className="space-y-4 px-6 py-6 sm:px-6 pb-safe"
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
        {form.formState.errors.email && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="contact-phone">Phone</Label>
        <PhoneInput
          value={form.watch("phone") ?? ""}
          onChange={(e164) => form.setValue("phone", e164 || undefined)}
          placeholder="e.g. 9841234567"
          numberInputId="contact-phone"
          className="mt-1"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="gender">Gender</Label>
          <Input
            id="gender"
            placeholder="Optional"
            {...form.register("gender")}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="birthDate">Birth date</Label>
          <Input
            id="birthDate"
            type="date"
            {...form.register("birthDate")}
            className="mt-1"
          />
        </div>
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Source</Label>
          <Select
            value={form.watch("source") || "__none__"}
            onValueChange={(v) =>
              form.setValue("source", v === "__none__" ? undefined : v)
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Journey Type</Label>
          <Select
            value={form.watch("journeyType") || "__none__"}
            onValueChange={(v) =>
              form.setValue("journeyType", v === "__none__" ? undefined : v)
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select journey type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {journeyTypes.map((jt) => (
                <SelectItem key={jt.id} value={jt.name}>
                  {jt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2 mt-1 items-center">
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
          <button
            type="button"
            onClick={async () => {
              const name = window.prompt("New tag name");
              if (!name?.trim()) return;
              try {
                const result = await createTagMutation.mutateAsync(name.trim());
                const current = form.watch("tagIds") ?? [];
                if (result?.tag && !current.includes(result.tag.id)) {
                  setOptimisticTags((prev) => [
                    ...prev.filter((t) => t.id !== result.tag.id),
                    { id: result.tag.id, name: result.tag.name },
                  ]);
                  form.setValue("tagIds", [...current, result.tag.id]);
                }
              } catch {
                toast({
                  title: "Failed to create tag",
                  variant: "destructive",
                });
              }
            }}
            disabled={createTagMutation.isPending}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 border border-dashed rounded px-2 py-1"
          >
            + Add tag
          </button>
        </div>
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
