"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import type { CreateCompanyData } from "../../services/company.service";

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

export function CompanyForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading,
  mode = "create",
}: CompanyFormProps) {
  const [formData, setFormData] = useState<CreateCompanyData>({
    name: defaultValues?.name ?? "",
    website: defaultValues?.website,
    address: defaultValues?.address,
    phone: defaultValues?.phone,
  });
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (defaultValues) {
      setFormData({
        name: defaultValues.name,
        website: defaultValues.website,
        address: defaultValues.address,
        phone: defaultValues.phone,
      });
    }
  }, [defaultValues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setNameError("Name is required");
      return;
    }
    setNameError("");
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6">
      <div>
        <Label>Name *</Label>
        <Input
          value={formData.name}
          onChange={(e) => {
            setFormData((p) => ({ ...p, name: e.target.value }));
            if (nameError) setNameError("");
          }}
          placeholder="Company name"
          className="mt-1"
        />
        {nameError && (
          <p className="text-sm text-destructive mt-1">{nameError}</p>
        )}
      </div>

      <div>
        <Label>Website</Label>
        <Input
          value={formData.website ?? ""}
          onChange={(e) =>
            setFormData((p) => ({
              ...p,
              website: e.target.value || undefined,
            }))
          }
          placeholder="https://..."
          className="mt-1"
        />
      </div>

      <div>
        <Label>Address</Label>
        <Input
          value={formData.address ?? ""}
          onChange={(e) =>
            setFormData((p) => ({
              ...p,
              address: e.target.value || undefined,
            }))
          }
          placeholder="Address"
          className="mt-1"
        />
      </div>

      <div>
        <Label>Phone</Label>
        <PhoneInput
          value={formData.phone ?? ""}
          onChange={(phone) =>
            setFormData((p) => ({ ...p, phone: phone || undefined }))
          }
          placeholder="e.g. 9841234567"
          numberInputId="company-phone"
          className="mt-1"
        />
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
