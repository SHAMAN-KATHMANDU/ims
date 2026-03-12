"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import type { CreateCompanyData } from "../../services/company.service";
import { CompanySchema, type CompanyInput } from "../../validation";

interface CompanyFormProps {
  defaultValues?: {
    name: string;
    website?: string;
    address?: string;
    phone?: string;
  };
  onSubmit: (data: CreateCompanyData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: "create" | "edit";
}

const formDefaults: CompanyInput = {
  name: "",
  website: "",
  address: "",
  phone: "",
};

export function CompanyForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading,
  mode = "create",
}: CompanyFormProps) {
  const form = useForm<CompanyInput>({
    resolver: zodResolver(CompanySchema),
    mode: "onBlur",
    defaultValues: {
      ...formDefaults,
      name: defaultValues?.name ?? "",
      website: defaultValues?.website ?? "",
      address: defaultValues?.address ?? "",
      phone: defaultValues?.phone ?? "",
    },
  });

  useEffect(() => {
    if (defaultValues) {
      form.reset({
        name: defaultValues.name,
        website: defaultValues.website ?? "",
        address: defaultValues.address ?? "",
        phone: defaultValues.phone ?? "",
      });
    }
  }, [defaultValues, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit({
      name: values.name,
      website: values.website?.trim() || undefined,
      address: values.address?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
    });
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6">
      <div>
        <Label htmlFor="company-name">Name *</Label>
        <Input
          id="company-name"
          {...form.register("name")}
          placeholder="Company name"
          className="mt-1"
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="company-website">Website</Label>
        <Input
          id="company-website"
          {...form.register("website")}
          placeholder="https://..."
          className="mt-1"
        />
        {form.formState.errors.website && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.website.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="company-address">Address</Label>
        <Input
          id="company-address"
          {...form.register("address")}
          placeholder="Address"
          className="mt-1"
        />
        {form.formState.errors.address && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.address.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="company-phone">Phone</Label>
        <Controller
          name="phone"
          control={form.control}
          render={({ field }) => (
            <PhoneInput
              value={field.value ?? ""}
              onChange={(v) => field.onChange(v ?? "")}
              onBlur={field.onBlur}
              placeholder="e.g. 9841234567"
              numberInputId="company-phone"
              className="mt-1"
            />
          )}
        />
        {form.formState.errors.phone && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.phone.message}
          </p>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? mode === "edit"
              ? "Saving..."
              : "Creating..."
            : mode === "edit"
              ? "Save Changes"
              : "Create Company"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
