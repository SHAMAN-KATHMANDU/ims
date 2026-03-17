"use client";

import { useState, useEffect, useRef } from "react";
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
import { useDebounce } from "@/hooks/useDebounce";
import { Plus, Trash2, ArrowRight, Search, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import type { Location } from "@/features/locations";
import type { CreateTransferData } from "../../hooks/use-transfers";
import {
  CreateTransferSchema,
  type CreateTransferInput,
} from "../../validation";

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
  onSubmit: (data: CreateTransferData, completeNow?: boolean) => Promise<void>;
  isLoading?: boolean;
  /** Fetches location inventory; optional search/limit for searchable product selector */
  getLocationInventory: (
    locationId: string,
    params?: { search?: string; limit?: number },
  ) => Promise<InventoryItem[]>;
  inline?: boolean;
}

const defaultValues: CreateTransferInput = {
  fromLocationId: "",
  toLocationId: "",
  items: [],
  notes: "",
};

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
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const debouncedProductSearch = useDebounce(productSearch, 300);
  const [completeNow, setCompleteNow] = useState(false);
  /** Cache of inventory items added to the transfer, for display when search results change */
  const addedItemsCacheRef = useRef<InventoryItem[]>([]);

  const form = useForm<CreateTransferInput>({
    resolver: zodResolver(CreateTransferSchema),
    mode: "onBlur",
    defaultValues,
  });

  const fromLocationId = form.watch("fromLocationId");
  const items = form.watch("items") ?? [];

  useEffect(() => {
    if (!fromLocationId) {
      setSearchResults([]);
      setProductSearch("");
      return;
    }
    form.setValue("items", []);
    addedItemsCacheRef.current = [];
  }, [fromLocationId, form]);

  // Search-only: fetch inventory when user types (debounced), same pattern as Sales
  useEffect(() => {
    if (!fromLocationId) return;
    if (!debouncedProductSearch.trim()) {
      setSearchResults([]);
      return;
    }
    setLoadingInventory(true);
    getLocationInventory(fromLocationId, {
      search: debouncedProductSearch.trim(),
      limit: 25,
    })
      .then((inventory) => {
        const withStock = inventory.filter((inv) => inv.quantity > 0);
        setSearchResults(withStock);
      })
      .catch((err) => {
        console.error(err);
        toast({
          title: "Failed to search inventory",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
        setSearchResults([]);
      })
      .finally(() => setLoadingInventory(false));
  }, [fromLocationId, debouncedProductSearch, getLocationInventory, toast]);

  useEffect(() => {
    if (!open && !inline) {
      form.reset(defaultValues);
      setProductSearch("");
      addedItemsCacheRef.current = [];
    }
  }, [open, inline, form]);

  const addItemToTransfer = (inventoryItem: InventoryItem, qty: number) => {
    const currentItems = form.getValues("items") ?? [];
    const subVariationId = inventoryItem.subVariationId ?? null;
    const existingIndex = currentItems.findIndex(
      (item) =>
        item.variationId === inventoryItem.variationId &&
        (item.subVariationId ?? null) === subVariationId,
    );
    const totalQtyAfterAdd =
      existingIndex >= 0 && currentItems[existingIndex]
        ? currentItems[existingIndex].quantity + qty
        : qty;
    if (totalQtyAfterAdd > inventoryItem.quantity) {
      toast({
        title: "Quantity exceeds available",
        description: `Only ${inventoryItem.quantity} available.`,
        variant: "destructive",
      });
      return;
    }
    if (existingIndex >= 0) {
      const newItems = [...currentItems];
      const itemToUpdate = newItems[existingIndex];
      if (itemToUpdate) {
        itemToUpdate.quantity += qty;
        form.setValue("items", newItems, { shouldValidate: true });
      }
    } else {
      const newItems = [
        ...currentItems,
        {
          variationId: inventoryItem.variationId,
          subVariationId: inventoryItem.subVariationId ?? undefined,
          quantity: qty,
        },
      ];
      form.setValue("items", newItems, { shouldValidate: true });
      addedItemsCacheRef.current = [
        ...addedItemsCacheRef.current,
        inventoryItem,
      ];
    }
  };

  /** Add product to transfer (qty 1) or increment if already in list — same as Sales module */
  const handleAddFromResult = (inv: InventoryItem) => {
    addItemToTransfer(inv, 1);
    setProductSearch("");
  };

  const handleIncreaseQuantity = (
    variationId: string,
    subVariationId?: string | null,
  ) => {
    const currentItems = form.getValues("items") ?? [];
    const idx = currentItems.findIndex(
      (item) =>
        item.variationId === variationId &&
        (item.subVariationId ?? null) === (subVariationId ?? null),
    );
    if (idx < 0) return;
    const inv = addedItemsCacheRef.current.find(
      (i) =>
        i.variationId === variationId &&
        (i.subVariationId ?? null) === (subVariationId ?? null),
    );
    const maxQty = inv?.quantity ?? 0;
    const item = currentItems[idx];
    if (!item || item.quantity >= maxQty) {
      if (maxQty > 0)
        toast({
          title: "Quantity exceeds available",
          description: `Only ${maxQty} available at source.`,
          variant: "destructive",
        });
      return;
    }
    const newItems = [...currentItems];
    newItems[idx] = { ...item, quantity: item.quantity + 1 };
    form.setValue("items", newItems, { shouldValidate: true });
  };

  const handleRemoveItem = (
    variationId: string,
    subVariationId?: string | null,
  ) => {
    const currentItems = form.getValues("items") ?? [];
    form.setValue(
      "items",
      currentItems.filter(
        (item) =>
          !(
            item.variationId === variationId &&
            (item.subVariationId ?? null) === (subVariationId ?? null)
          ),
      ),
      { shouldValidate: true },
    );
    addedItemsCacheRef.current = addedItemsCacheRef.current.filter(
      (inv) =>
        !(
          inv.variationId === variationId &&
          (inv.subVariationId ?? null) === (subVariationId ?? null)
        ),
    );
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(
      {
        fromLocationId: values.fromLocationId,
        toLocationId: values.toLocationId,
        items: values.items.map((item) => ({
          variationId: item.variationId,
          subVariationId: item.subVariationId ?? undefined,
          quantity: item.quantity,
        })),
        notes: values.notes || undefined,
      },
      completeNow,
    );
  });

  const activeLocations = locations.filter((loc) => loc.isActive);

  const getItemDisplay = (item: (typeof items)[0]) => {
    const cache = addedItemsCacheRef.current;
    const inv =
      cache.find(
        (i) =>
          i.variationId === item.variationId &&
          (i.subVariationId ?? null) === (item.subVariationId ?? null),
      ) ??
      searchResults.find(
        (i) =>
          i.variationId === item.variationId &&
          (i.subVariationId ?? null) === (item.subVariationId ?? null),
      );
    if (!inv)
      return {
        productName: "—",
        imsCode: "—",
        attributeLabel: "",
        subVariationName: undefined,
      };
    const attrLabel =
      inv.variation.attributes
        ?.map((a) => a.attributeValue.value)
        .join(" / ") || "";
    return {
      productName: inv.variation.product.name,
      imsCode: inv.variation.product.imsCode,
      subVariationName: inv.subVariation?.name,
      attributeLabel: attrLabel,
    };
  };

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
          isLoading ||
          !fromLocationId ||
          !form.watch("toLocationId") ||
          (items?.length ?? 0) === 0
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
        <div className="grid grid-cols-[1fr,auto,1fr] items-end gap-4">
          <div className="grid gap-2">
            <Label htmlFor="from">From Location *</Label>
            <Controller
              name="fromLocationId"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => field.onChange(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeLocations
                      .filter((loc) => loc.id !== form.watch("toLocationId"))
                      .map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name} ({location.type})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.fromLocationId && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.fromLocationId.message}
              </p>
            )}
          </div>

          <ArrowRight className="h-5 w-5 text-muted-foreground mb-2" />

          <div className="grid gap-2">
            <Label htmlFor="to">To Location *</Label>
            <Controller
              name="toLocationId"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => field.onChange(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeLocations
                      .filter((loc) => loc.id !== form.watch("fromLocationId"))
                      .map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name} ({location.type})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.toLocationId && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.toLocationId.message}
              </p>
            )}
          </div>
        </div>

        {fromLocationId && (
          <div className="grid gap-2">
            <Label>Add Product</Label>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search by product name, IMS code, or category..."
                  className="pl-9"
                  aria-label="Search products to add to transfer"
                />
              </div>
              {loadingInventory && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!productSearch.trim() && !loadingInventory && (
                <div className="p-8 text-center text-sm text-muted-foreground border rounded-lg border-dashed">
                  Search for products by name, IMS code, or category…
                </div>
              )}
              {productSearch.trim() &&
                !loadingInventory &&
                searchResults.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground border rounded-lg">
                    No products found. Try a different search term.
                  </div>
                )}
              {productSearch.trim() &&
                !loadingInventory &&
                searchResults.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                    {searchResults.map((inv) => {
                      const attrLabel =
                        inv.variation.attributes
                          ?.map((a) => a.attributeValue.value)
                          .join(" / ") || "";
                      const variantLabel = [attrLabel, inv.subVariation?.name]
                        .filter(Boolean)
                        .join(" / ");
                      return (
                        <div
                          key={inv.id}
                          role="button"
                          tabIndex={0}
                          className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => handleAddFromResult(inv)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleAddFromResult(inv);
                            }
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">
                              {inv.variation.product.name}
                              {variantLabel && (
                                <span className="text-muted-foreground font-normal ml-1.5">
                                  — {variantLabel}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono mt-0.5">
                              {inv.variation.product.imsCode}
                              {inv.subVariation?.name
                                ? ` / ${inv.subVariation.name}`
                                : ""}
                            </div>
                          </div>
                          <div className="ml-4 flex items-center gap-4 shrink-0">
                            <div className="text-right text-xs text-muted-foreground">
                              Stock: {inv.quantity}
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddFromResult(inv);
                              }}
                              disabled={inv.quantity < 1}
                              aria-label={`Add ${inv.variation.product.name} to transfer`}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          </div>
        )}

        {items.length > 0 && (
          <div className="grid gap-2">
            <Label>Transfer Items ({items.length})</Label>
            {form.formState.errors.items && (
              <p className="text-sm text-destructive">
                {form.formState.errors.items.message}
              </p>
            )}
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
                    const display = getItemDisplay(item);
                    const variationLabel =
                      display.attributeLabel ||
                      display.subVariationName ||
                      (items.length > 1 ? "Variation" : "");
                    return (
                      <TableRow
                        key={`${item.variationId}-${item.subVariationId ?? "v"}-${idx}`}
                      >
                        <TableCell className="font-medium">
                          {display.productName}
                          {variationLabel && (
                            <span className="text-muted-foreground font-normal ml-1.5">
                              — {variationLabel}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {display.imsCode}
                          {display.subVariationName
                            ? ` / ${display.subVariationName}`
                            : ""}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="tabular-nums w-8">
                              {item.quantity}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                handleIncreaseQuantity(
                                  item.variationId,
                                  item.subVariationId,
                                )
                              }
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              handleRemoveItem(
                                item.variationId,
                                item.subVariationId,
                              )
                            }
                            aria-label="Remove from transfer"
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

        <div className="grid gap-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            {...form.register("notes")}
            placeholder="Add any notes about this transfer..."
            rows={2}
          />
        </div>

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
      <DialogContent className="max-w-2xl" allowDismiss={false}>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
