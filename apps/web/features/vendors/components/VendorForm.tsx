"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Vendor name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Person</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Contact person name or email"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Phone uses numberInputId rather than the standard id prop so we keep
            a manual htmlFor="vendor-phone" binding instead of FormControl. */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <Label htmlFor="vendor-phone">Phone</Label>
              <PhoneInput
                value={field.value ?? ""}
                onChange={(phone) =>
                  form.setValue("phone", phone || "", { shouldValidate: true })
                }
                placeholder="e.g. 9841234567"
                numberInputId="vendor-phone"
              />
              {fieldState.error && (
                <p
                  id="vendor-phone-error"
                  role="alert"
                  className="text-sm text-destructive mt-1"
                >
                  {fieldState.error.message}
                </p>
              )}
            </div>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Vendor address"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <SubmitButton
            isLoading={isLoading}
            label={editingVendor ? "Save changes" : "Create vendor"}
            loadingLabel="Saving..."
          />
        </div>
      </form>
    </Form>
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
