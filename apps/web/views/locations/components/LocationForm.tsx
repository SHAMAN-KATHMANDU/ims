"use client";

import { useState, useEffect } from "react";
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
import type { Location, LocationType } from "@/hooks/useLocation";

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
}

export function LocationForm({
  open,
  onOpenChange,
  editingLocation,
  onSubmit,
  onReset,
  isLoading,
  inline = false,
}: LocationFormProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<LocationType>("SHOWROOM");
  const [address, setAddress] = useState("");
  const [isDefaultWarehouse, setIsDefaultWarehouse] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (editingLocation) {
      setName(editingLocation.name);
      setType(editingLocation.type);
      setAddress(editingLocation.address || "");
      setIsDefaultWarehouse(editingLocation.isDefaultWarehouse ?? false);
    } else {
      setName("");
      setType("SHOWROOM");
      setAddress("");
      setIsDefaultWarehouse(false);
    }
  }, [editingLocation, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name,
      type,
      address,
      // Send false when not warehouse so backend clears default when type changes to SHOWROOM
      isDefaultWarehouse: type === "WAREHOUSE" ? isDefaultWarehouse : false,
    });
  };

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
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Main Warehouse"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="type">Type *</Label>
          <Select
            value={type}
            onValueChange={(value) => setType(value as LocationType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
              <SelectItem value="SHOWROOM">Showroom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter the location address..."
            rows={3}
          />
        </div>
        {type === "WAREHOUSE" && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isDefaultWarehouse"
              checked={isDefaultWarehouse}
              onCheckedChange={(checked) =>
                setIsDefaultWarehouse(checked === true)
              }
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
        <Button type="submit" disabled={isLoading || !name.trim()}>
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
