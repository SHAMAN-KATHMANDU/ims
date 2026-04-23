"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import type { Vendor, CreateOrUpdateVendorData } from "../hooks/use-vendors";
import { CreateVendorSchema, type CreateVendorInput } from "../validation";

interface VendorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingVendor: Vendor | null;
  onSubmit: (data: CreateOrUpdateVendorData) => Promise<void>;
  onReset: () => void;
  isLoading?: boolean;
  /** When true, render form only (no Dialog/trigger). For use on dedicated pages (e.g. mobile). */
  inline?: boolean;
  /** When false, do not render the Dialog trigger (parent opens dialog). Default true. */
  renderTrigger?: boolean;
}

const defaultValues: CreateVendorInput = {
  name: "",
  contact: "",
  phone: "",
  address: "",
};

export function VendorForm({
  open,
  onOpenChange,
  editingVendor,
  onSubmit,
  onReset,
  isLoading,
  inline = false,
  renderTrigger = true,
}: VendorFormProps) {
  const form = useForm<CreateVendorInput>({
    resolver: zodResolver(CreateVendorSchema),
    mode: "onBlur",
    defaultValues,
  });

  useEffect(() => {
    if (open && editingVendor) {
      form.reset({
        name: editingVendor.name,
        contact: editingVendor.contact || "",
        phone: editingVendor.phone || "",
        address: editingVendor.address || "",
      });
    } else if (!open) {
      form.reset(defaultValues);
    }
  }, [open, editingVendor, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit({
      name: values.name,
      contact: values.contact ?? "",
      phone: values.phone ?? "",
      address: values.address ?? "",
    });
    onOpenChange(false);
    onReset();
  });

  const handleCancel = () => {
    onOpenChange(false);
    onReset();
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="vendor-name">Name *</Label>
        <Input
          id="vendor-name"
          {...form.register("name")}
          placeholder="Vendor name"
          aria-invalid={!!form.formState.errors.name}
          aria-describedby={
            form.formState.errors.name ? "vendor-name-error" : undefined
          }
        />
        {form.formState.errors.name && (
          <p
            id="vendor-name-error"
            role="alert"
            className="text-sm text-destructive mt-1"
          >
            {form.formState.errors.name.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="vendor-contact">Contact Person</Label>
        <Input
          id="vendor-contact"
          {...form.register("contact")}
          placeholder="Contact person name or email"
          aria-invalid={!!form.formState.errors.contact}
          aria-describedby={
            form.formState.errors.contact ? "vendor-contact-error" : undefined
          }
        />
        {form.formState.errors.contact && (
          <p
            id="vendor-contact-error"
            role="alert"
            className="text-sm text-destructive mt-1"
          >
            {form.formState.errors.contact.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="vendor-phone">Phone</Label>
        <PhoneInput
          value={form.watch("phone") ?? ""}
          onChange={(phone) =>
            form.setValue("phone", phone || "", { shouldValidate: true })
          }
          placeholder="e.g. 9841234567"
          numberInputId="vendor-phone"
        />
        {form.formState.errors.phone && (
          <p
            id="vendor-phone-error"
            role="alert"
            className="text-sm text-destructive mt-1"
          >
            {form.formState.errors.phone.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="vendor-address">Address</Label>
        <Input
          id="vendor-address"
          {...form.register("address")}
          placeholder="Vendor address"
          aria-invalid={!!form.formState.errors.address}
          aria-describedby={
            form.formState.errors.address ? "vendor-address-error" : undefined
          }
        />
        {form.formState.errors.address && (
          <p
            id="vendor-address-error"
            role="alert"
            className="text-sm text-destructive mt-1"
          >
            {form.formState.errors.address.message}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {editingVendor ? "Save changes" : "Create vendor"}
        </Button>
      </div>
    </form>
  );

  if (inline) {
    return (
      <div className="max-w-lg space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">
            {editingVendor ? "Edit Vendor" : "New Vendor"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {editingVendor
              ? "Update vendor contact information."
              : "Add a new product vendor."}
          </p>
        </div>
        {formContent}
      </div>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onReset();
        onOpenChange(o);
      }}
    >
      {renderTrigger && (
        <DialogTrigger asChild>
          <Button onClick={() => onReset()}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            New Vendor
          </Button>
        </DialogTrigger>
      )}
      <DialogContent allowDismiss={false}>
        <DialogHeader>
          <DialogTitle>
            {editingVendor ? "Edit Vendor" : "New Vendor"}
          </DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
