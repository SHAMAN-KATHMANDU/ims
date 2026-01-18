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
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Location } from "@/hooks/useLocation";
import type { CreateTransferData } from "@/hooks/useTransfer";

interface TransferItem {
  variationId: string;
  productName: string;
  color: string;
  quantity: number;
  availableQuantity: number;
}

interface InventoryItem {
  id: string;
  variationId: string;
  quantity: number;
  variation: {
    id: string;
    color: string;
    product: {
      id: string;
      imsCode: string;
      name: string;
    };
  };
}

interface TransferFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: Location[];
  onSubmit: (data: CreateTransferData) => Promise<void>;
  isLoading?: boolean;
  getLocationInventory: (locationId: string) => Promise<InventoryItem[]>;
}

export function TransferForm({
  open,
  onOpenChange,
  locations,
  onSubmit,
  isLoading,
  getLocationInventory,
}: TransferFormProps) {
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<TransferItem[]>([]);
  const [availableInventory, setAvailableInventory] = useState<InventoryItem[]>(
    [],
  );
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [selectedVariationId, setSelectedVariationId] = useState("");
  const [quantity, setQuantity] = useState("1");

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

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFromLocationId("");
      setToLocationId("");
      setNotes("");
      setItems([]);
      setSelectedVariationId("");
      setQuantity("1");
    }
  }, [open]);

  const handleAddItem = () => {
    if (!selectedVariationId || !quantity) return;

    const inventoryItem = availableInventory.find(
      (inv) => inv.variationId === selectedVariationId,
    );
    if (!inventoryItem) return;

    const parsedQuantity = parseInt(quantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) return;

    // Check if item already exists
    const existingIndex = items.findIndex(
      (item) => item.variationId === selectedVariationId,
    );

    if (existingIndex >= 0) {
      // Update quantity
      const newItems = [...items];
      const itemToUpdate = newItems[existingIndex];
      if (itemToUpdate) {
        itemToUpdate.quantity += parsedQuantity;
        setItems(newItems);
      }
    } else {
      // Add new item
      setItems([
        ...items,
        {
          variationId: selectedVariationId,
          productName: inventoryItem.variation.product.name,
          color: inventoryItem.variation.color,
          quantity: parsedQuantity,
          availableQuantity: inventoryItem.quantity,
        },
      ]);
    }

    setSelectedVariationId("");
    setQuantity("1");
  };

  const handleRemoveItem = (variationId: string) => {
    setItems(items.filter((item) => item.variationId !== variationId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromLocationId || !toLocationId || items.length === 0) return;

    await onSubmit({
      fromLocationId,
      toLocationId,
      items: items.map((item) => ({
        variationId: item.variationId,
        quantity: item.quantity,
      })),
      notes: notes || undefined,
    });
  };

  const activeLocations = locations.filter((loc) => loc.isActive);
  const selectedInventoryItem = availableInventory.find(
    (inv) => inv.variationId === selectedVariationId,
  );
  const maxQuantity = selectedInventoryItem?.quantity || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Transfer</DialogTitle>
            <DialogDescription>
              Transfer products between locations. Select source and
              destination, then add items to transfer.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Location Selection */}
            <div className="grid grid-cols-[1fr,auto,1fr] items-end gap-4">
              <div className="grid gap-2">
                <Label htmlFor="from">From Location *</Label>
                <Select
                  value={fromLocationId}
                  onValueChange={setFromLocationId}
                >
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
                    value={selectedVariationId}
                    onValueChange={setSelectedVariationId}
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
                      {availableInventory
                        .filter((inv) => inv.quantity > 0)
                        .map((inv) => (
                          <SelectItem
                            key={inv.variationId}
                            value={inv.variationId}
                          >
                            {inv.variation.product.name} - {inv.variation.color}{" "}
                            ({inv.quantity} available)
                          </SelectItem>
                        ))}
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
                    disabled={!selectedVariationId || !quantity}
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
                        <TableHead>Color</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.variationId}>
                          <TableCell className="font-medium">
                            {item.productName}
                          </TableCell>
                          <TableCell>{item.color}</TableCell>
                          <TableCell className="text-right">
                            {item.quantity}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(item.variationId)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
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
          </div>

          <DialogFooter>
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
                isLoading ||
                !fromLocationId ||
                !toLocationId ||
                items.length === 0
              }
            >
              {isLoading ? "Creating..." : "Create Transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
