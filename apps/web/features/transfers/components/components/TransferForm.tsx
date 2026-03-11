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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/useToast";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import type { Location } from "@/features/locations";
import type { CreateTransferData } from "../../hooks/use-transfers";

interface TransferItem {
  variationId: string;
  subVariationId?: string | null;
  subVariationName?: string;
  productName: string;
  imsCode: string;
  attributeLabel?: string;
  quantity: number;
  availableQuantity: number;
}

interface InventoryItem {
  id: string;
  variationId: string;
  subVariationId?: string | null;
  subVariation?: { id: string; name: string };
  quantity: number;
  variation: {
    id: string;
    product: {
      id: string;
      imsCode: string;
      name: string;
    };
    attributes?: Array<{
      attributeType: { name: string };
      attributeValue: { value: string };
    }>;
  };
}

interface TransferFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: Location[];
  /** Second arg: when true, approve + start transit + complete so stock moves immediately. Used on create page. */
  onSubmit: (data: CreateTransferData, completeNow?: boolean) => Promise<void>;
  isLoading?: boolean;
  getLocationInventory: (locationId: string) => Promise<InventoryItem[]>;
  /** When true, render form inline (e.g. on a dedicated page) without dialog. */
  inline?: boolean;
}

export function TransferForm({
  open,
  onOpenChange,
  locations,
  onSubmit,
  isLoading,
  getLocationInventory,
  inline = false,
}: TransferFormProps) {
  const { toast } = useToast();
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<TransferItem[]>([]);
  const [availableInventory, setAvailableInventory] = useState<InventoryItem[]>(
    [],
  );
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [completeNow, setCompleteNow] = useState(false);

  // Load inventory when source location changes
  useEffect(() => {
    if (fromLocationId) {
      setLoadingInventory(true);
      getLocationInventory(fromLocationId)
        .then((inventory) => {
          setAvailableInventory(inventory);
          // Clear items when source changes
          setItems([]);
        })
        .catch(console.error)
        .finally(() => setLoadingInventory(false));
    } else {
      setAvailableInventory([]);
      setItems([]);
    }
  }, [fromLocationId, getLocationInventory]);

  // Reset form when dialog closes; when inline, reset on mount
  useEffect(() => {
    if (!open && !inline) {
      setFromLocationId("");
      setToLocationId("");
      setNotes("");
      setItems([]);
      setSelectedInventoryId("");
      setQuantity("");
    }
  }, [open, inline]);

  const handleAddItem = () => {
    if (!selectedInventoryId || !quantity) return;

    const inventoryItem = availableInventory.find(
      (inv) => inv.id === selectedInventoryId,
    );
    if (!inventoryItem) return;

    const parsedQuantity = parseInt(quantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a positive number.",
        variant: "destructive",
      });
      return;
    }

    const availableQty = inventoryItem.quantity;
    const subVariationId = inventoryItem.subVariationId ?? null;
    const existingIndex = items.findIndex(
      (item) =>
        item.variationId === inventoryItem.variationId &&
        (item.subVariationId ?? null) === subVariationId,
    );

    const totalQtyAfterAdd =
      existingIndex >= 0 && items[existingIndex]
        ? items[existingIndex].quantity + parsedQuantity
        : parsedQuantity;

    if (totalQtyAfterAdd > availableQty) {
      toast({
        title: "Quantity exceeds available",
        description: `Only ${availableQty} available. You entered ${parsedQuantity}${existingIndex >= 0 ? ` (total would be ${totalQtyAfterAdd})` : ""}.`,
        variant: "destructive",
      });
      return;
    }

    if (existingIndex >= 0) {
      const newItems = [...items];
      const itemToUpdate = newItems[existingIndex];
      if (itemToUpdate) {
        itemToUpdate.quantity += parsedQuantity;
        setItems(newItems);
      }
    } else {
      const attrLabel =
        inventoryItem.variation.attributes
          ?.map((a) => a.attributeValue.value)
          .join(" / ") || "";
      setItems([
        ...items,
        {
          variationId: inventoryItem.variationId,
          subVariationId: inventoryItem.subVariationId ?? undefined,
          subVariationName: inventoryItem.subVariation?.name,
          productName: inventoryItem.variation.product.name,
          imsCode: inventoryItem.variation.product.imsCode,
          attributeLabel: attrLabel,
          quantity: parsedQuantity,
          availableQuantity: inventoryItem.quantity,
        },
      ]);
    }

    setSelectedInventoryId("");
    setQuantity("");
  };

  const handleRemoveItem = (
    variationId: string,
    subVariationId?: string | null,
  ) => {
    setItems(
      items.filter(
        (item) =>
          !(
            item.variationId === variationId &&
            (item.subVariationId ?? null) === (subVariationId ?? null)
          ),
      ),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromLocationId || !toLocationId || items.length === 0) return;

    await onSubmit(
      {
        fromLocationId,
        toLocationId,
        items: items.map((item) => ({
          variationId: item.variationId,
          subVariationId: item.subVariationId ?? undefined,
          quantity: item.quantity,
        })),
        notes: notes || undefined,
      },
      completeNow,
    );
  };

  const activeLocations = locations.filter((loc) => loc.isActive);
  const selectedInventoryItem = availableInventory.find(
    (inv) => inv.id === selectedInventoryId,
  );
  const maxQuantity = selectedInventoryItem?.quantity ?? 0;

  const formHeader = inline ? (
    <div className="space-y-1.5 pb-4">
      <h2 className="text-lg font-semibold leading-none tracking-tight">
        Create Transfer
      </h2>
      <p className="text-sm text-muted-foreground">
        Transfer products between locations. Select source and destination, then
        add items to transfer.
      </p>
    </div>
  ) : (
    <DialogHeader>
      <DialogTitle>Create Transfer</DialogTitle>
      <DialogDescription>
        Transfer products between locations. Select source and destination, then
        add items to transfer.
      </DialogDescription>
    </DialogHeader>
  );

  const formFooter = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        disabled={
          isLoading || !fromLocationId || !toLocationId || items.length === 0
        }
      >
        {isLoading ? "Creating..." : "Create Transfer"}
      </Button>
    </>
  );

  const formContent = (
    <form onSubmit={handleSubmit}>
      {formHeader}

      <div className="grid gap-4 py-4">
        {/* Location Selection */}
        <div className="grid grid-cols-[1fr,auto,1fr] items-end gap-4">
          <div className="grid gap-2">
            <Label htmlFor="from">From Location *</Label>
            <Select value={fromLocationId} onValueChange={setFromLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {activeLocations
                  .filter((loc) => loc.id !== toLocationId)
                  .map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name} ({location.type})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <ArrowRight className="h-5 w-5 text-muted-foreground mb-2" />

          <div className="grid gap-2">
            <Label htmlFor="to">To Location *</Label>
            <Select value={toLocationId} onValueChange={setToLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                {activeLocations
                  .filter((loc) => loc.id !== fromLocationId)
                  .map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name} ({location.type})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Item Selection */}
        {fromLocationId && (
          <div className="grid gap-2">
            <Label>Add Items</Label>
            <div className="flex gap-2">
              <Select
                value={selectedInventoryId || "__none__"}
                onValueChange={(v) =>
                  setSelectedInventoryId(v === "__none__" ? "" : v)
                }
                disabled={loadingInventory}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue
                    placeholder={
                      loadingInventory
                        ? "Loading inventory..."
                        : "Select product"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    {loadingInventory
                      ? "Loading inventory..."
                      : "Select product"}
                  </SelectItem>
                  {availableInventory
                    .filter((inv) => inv.quantity > 0)
                    .map((inv) => {
                      const attrLabel =
                        inv.variation.attributes
                          ?.map((a) => a.attributeValue.value)
                          .join(" / ") || "";
                      const variationLabel = attrLabel
                        ? ` — ${attrLabel}`
                        : inv.subVariation?.name
                          ? ` — ${inv.subVariation.name}`
                          : " — Variation";
                      return (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.variation.product.name}
                          {variationLabel} [{inv.variation.product.imsCode}
                          {inv.subVariation?.name
                            ? ` / ${inv.subVariation.name}`
                            : ""}
                          ] ({inv.quantity} available)
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="1"
                max={maxQuantity}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-24"
                placeholder="Qty"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddItem}
                disabled={!selectedInventoryId || !quantity}
              >
                Add
              </Button>
            </div>
          </div>
        )}

        {/* Items List */}
        {items.length > 0 && (
          <div className="grid gap-2">
            <Label>Transfer Items ({items.length})</Label>
            <ScrollArea className="h-[200px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>IMS Code</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => {
                    const variationLabel =
                      item.attributeLabel ||
                      item.subVariationName ||
                      (items.length > 1 ? "Variation" : "");
                    return (
                      <TableRow
                        key={`${item.variationId}-${item.subVariationId ?? "v"}-${idx}`}
                      >
                        <TableCell className="font-medium">
                          {item.productName}
                          {variationLabel && (
                            <span className="text-muted-foreground font-normal ml-1.5">
                              — {variationLabel}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.imsCode}
                          {item.subVariationName
                            ? ` / ${item.subVariationName}`
                            : ""}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleRemoveItem(
                                item.variationId,
                                item.subVariationId,
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {/* Notes */}
        <div className="grid gap-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this transfer..."
            rows={2}
          />
        </div>

        {/* Complete now: only on create page (inline) */}
        {inline && (
          <div className="flex items-center gap-2">
            <Switch
              id="completeNow"
              checked={completeNow}
              onCheckedChange={(checked) => setCompleteNow(checked === true)}
            />
            <Label
              htmlFor="completeNow"
              className="text-sm font-normal cursor-pointer"
            >
              Complete transfer now (move stock from source to destination
              immediately)
            </Label>
          </div>
        )}
      </div>

      {inline ? (
        <div className="flex justify-end gap-2 pt-4">{formFooter}</div>
      ) : (
        <DialogFooter>{formFooter}</DialogFooter>
      )}
    </form>
  );

  if (inline) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="pt-6">{formContent}</CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">{formContent}</DialogContent>
    </Dialog>
  );
}
