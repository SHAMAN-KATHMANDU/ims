"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import type { Vendor, CreateOrUpdateVendorData } from "@/hooks/useVendors";

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

const initialFormData: CreateOrUpdateVendorData = {
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
  const [formData, setFormData] =
    useState<CreateOrUpdateVendorData>(initialFormData);

  useEffect(() => {
    if (open && editingVendor) {
      setFormData({
        name: editingVendor.name,
        contact: editingVendor.contact || "",
        phone: editingVendor.phone || "",
        address: editingVendor.address || "",
      });
    } else if (!open) {
      setFormData(initialFormData);
    }
  }, [open, editingVendor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    onOpenChange(false);
    onReset();
  };

  const handleCancel = () => {
    onOpenChange(false);
    onReset();
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Name *</label>
        <Input
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="Vendor name"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Contact Person</label>
        <Input
          value={formData.contact ?? ""}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, contact: e.target.value }))
          }
          placeholder="Contact person name or email"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Phone</label>
        <Input
          value={formData.phone ?? ""}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, phone: e.target.value }))
          }
          placeholder="Contact number"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Address</label>
        <Input
          value={formData.address ?? ""}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, address: e.target.value }))
          }
          placeholder="Vendor address"
        />
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
            <Plus className="mr-2 h-4 w-4" />
            New Vendor
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
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
