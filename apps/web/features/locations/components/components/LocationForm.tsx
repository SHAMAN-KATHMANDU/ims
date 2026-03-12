"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import type { Location, LocationType } from "../../hooks/use-locations";
import {
  CreateLocationSchema,
  type CreateLocationInput,
} from "../../validation";

interface LocationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingLocation: Location | null;
  onSubmit: (data: {
    name: string;
    type: LocationType;
    address: string;
    isDefaultWarehouse?: boolean;
  }) => Promise<void>;
  onReset: () => void;
  isLoading?: boolean;
  /** When true, render form only (no Dialog/trigger). For use on dedicated pages (e.g. mobile). */
  inline?: boolean;
  /** Default values when creating (editingLocation is null). Used e.g. for onboarding. */
  defaultValues?: {
    name?: string;
    type?: LocationType;
    isDefaultWarehouse?: boolean;
  };
}

const formDefaults: CreateLocationInput = {
  name: "",
  type: "SHOWROOM",
  address: "",
  isDefaultWarehouse: false,
};

export function LocationForm({
  open,
  onOpenChange,
  editingLocation,
  onSubmit,
  onReset,
  isLoading,
  inline = false,
  defaultValues,
}: LocationFormProps) {
  const form = useForm<CreateLocationInput>({
    resolver: zodResolver(CreateLocationSchema),
    mode: "onBlur",
    defaultValues: {
      ...formDefaults,
      name: defaultValues?.name ?? "",
      type: (defaultValues?.type ?? "SHOWROOM") as "WAREHOUSE" | "SHOWROOM",
      isDefaultWarehouse: defaultValues?.isDefaultWarehouse ?? false,
    },
  });

  const locationType = form.watch("type");

  useEffect(() => {
    if (editingLocation) {
      form.reset({
        name: editingLocation.name,
        type: editingLocation.type,
        address: editingLocation.address || "",
        isDefaultWarehouse: editingLocation.isDefaultWarehouse ?? false,
      });
    } else {
      form.reset({
        ...formDefaults,
        name: defaultValues?.name ?? "",
        type: (defaultValues?.type ?? "SHOWROOM") as "WAREHOUSE" | "SHOWROOM",
        address: "",
        isDefaultWarehouse: defaultValues?.isDefaultWarehouse ?? false,
      });
    }
  }, [editingLocation, open, defaultValues, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit({
      name: values.name,
      type: values.type as LocationType,
      address: values.address,
      isDefaultWarehouse:
        values.type === "WAREHOUSE" ? values.isDefaultWarehouse : false,
    });
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      onReset();
    }
    onOpenChange(newOpen);
  };

  const formContent = (
    <form onSubmit={handleSubmit}>
      {!inline && (
        <DialogHeader>
          <DialogTitle>
            {editingLocation ? "Edit Location" : "Add New Location"}
          </DialogTitle>
          <DialogDescription>
            {editingLocation
              ? "Update the location details below."
              : "Create a new warehouse or showroom location."}
          </DialogDescription>
        </DialogHeader>
      )}
      {inline && (
        <div className="space-y-1 mb-4">
          <h2 className="text-2xl font-semibold">
            {editingLocation ? "Edit Location" : "Add New Location"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {editingLocation
              ? "Update the location details below."
              : "Create a new warehouse or showroom location."}
          </p>
        </div>
      )}
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="location-name">Name *</Label>
          <Input
            id="location-name"
            {...form.register("name")}
            placeholder="e.g., Main Warehouse"
          />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="location-type">Type *</Label>
          <Controller
            name="type"
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) =>
                  field.onChange(value as "WAREHOUSE" | "SHOWROOM")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                  <SelectItem value="SHOWROOM">Showroom</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.type && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.type.message}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="location-address">Address</Label>
          <Textarea
            id="location-address"
            {...form.register("address")}
            placeholder="Enter the location address..."
            rows={3}
          />
          {form.formState.errors.address && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.address.message}
            </p>
          )}
        </div>
        {locationType === "WAREHOUSE" && (
          <div className="flex items-center space-x-2">
            <Controller
              name="isDefaultWarehouse"
              control={form.control}
              render={({ field }) => (
                <Checkbox
                  id="isDefaultWarehouse"
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
              )}
            />
            <Label
              htmlFor="isDefaultWarehouse"
              className="text-sm font-normal cursor-pointer"
            >
              Use as default warehouse for new products
            </Label>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? "Saving..."
            : editingLocation
              ? "Update Location"
              : "Create Location"}
        </Button>
      </DialogFooter>
    </form>
  );

  if (inline) {
    return <div className="max-w-lg">{formContent}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Location
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">{formContent}</DialogContent>
    </Dialog>
  );
}
