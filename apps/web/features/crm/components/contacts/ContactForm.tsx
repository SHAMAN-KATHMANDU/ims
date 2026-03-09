"use client";

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
import { useContactTags } from "../../hooks/use-contacts";
import {
  useCrmSources,
  useCrmJourneyTypes,
} from "../../hooks/use-crm-settings";
import type { CreateContactData } from "../../services/contact.service";

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  companyId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  source: z.string().optional(),
  journeyType: z.string().optional(),
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
  const { data: sourcesData } = useCrmSources();
  const { data: journeyTypesData } = useCrmJourneyTypes();
  const companies = companiesData?.companies ?? [];
  const tags = tagsData?.tags ?? [];
  const sources = sourcesData?.sources ?? [];
  const journeyTypes = journeyTypesData?.journeyTypes ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: defaultValues?.firstName ?? "",
      lastName: defaultValues?.lastName ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      companyId: defaultValues?.companyId ?? "",
      tagIds: defaultValues?.tagIds ?? [],
      source: defaultValues?.source ?? "",
      journeyType: defaultValues?.journeyType ?? "",
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit({
          firstName: values.firstName,
          lastName: values.lastName || undefined,
          email: values.email || undefined,
          phone: values.phone?.trim() || undefined,
          companyId: values.companyId || undefined,
          tagIds: values.tagIds,
          source: values.source || undefined,
          journeyType: values.journeyType || undefined,
        });
      })}
      className="space-y-4 pb-safe"
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
        <Label htmlFor="contact-phone">Phone</Label>
        <PhoneInput
          value={form.watch("phone") ?? ""}
          onChange={(e164) => form.setValue("phone", e164 || undefined)}
          placeholder="e.g. 9841234567"
          numberInputId="contact-phone"
          className="mt-1"
        />
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
