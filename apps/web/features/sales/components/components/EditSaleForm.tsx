"use client";

import { useState, useEffect } from "react";
import { getProductByImsCode, type Product } from "@/features/products";
import {
  getLocationInventory,
  type LocationInventoryItem,
} from "@/features/analytics";
import { useDebounce } from "@/hooks/useDebounce";
import {
  type Sale,
  type SaleItem,
  type EditSaleData,
  formatCurrency,
} from "../../hooks/use-sales";
import type { CreateSaleItem } from "../../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Minus, Trash2, Search, Loader2 } from "lucide-react";

interface EditableItem {
  variationId: string;
  subVariationId: string | null;
  quantity: number;
  productName: string;
  imsCode: string;
  unitPrice: number;
  maxQuantity: number;
}

function saleItemToEditable(item: SaleItem): EditableItem {
  const variation = item.variation as {
    product?: { name?: string; imsCode?: string };
    subVariations?: { id: string }[];
  };
  const productName = variation?.product?.name ?? "—";
  const imsCode = variation?.product?.imsCode ?? "";
  const subVariationId =
    "subVariationId" in item && item.subVariationId
      ? item.subVariationId
      : null;
  return {
    variationId: item.variationId,
    subVariationId,
    quantity: item.quantity,
    productName,
    imsCode,
    unitPrice: Number(item.unitPrice),
    maxQuantity: 999,
  };
}

type ProductVariationItem = NonNullable<Product["variations"]>[number];

function getAddableRowsFromProduct(
  product: Product,
  locationId: string,
): {
  variation: ProductVariationItem;
  subVariation: { id: string; name: string } | null;
  quantity: number;
}[] {
  const rows: {
    variation: ProductVariationItem;
    subVariation: { id: string; name: string } | null;
    quantity: number;
  }[] = [];
  const vList = product.variations ?? [];
  for (const v of vList) {
    const locInv =
      (
        v as {
          locationInventory?: Array<{
            quantity: number;
            subVariationId?: string | null;
            subVariation?: { id: string; name: string };
            location?: { id: string };
          }>;
        }
      ).locationInventory ?? [];
    const atLocation = locInv.filter(
      (i) => !i.location || i.location.id === locationId,
    );
    const hasSubVariants =
      ((v as { subVariations?: unknown[] }).subVariations?.length ?? 0) > 0;

    if (hasSubVariants) {
      for (const inv of atLocation) {
        if (inv.quantity > 0 && inv.subVariation) {
          rows.push({
            variation: v,
            subVariation: inv.subVariation,
            quantity: inv.quantity,
          });
        }
      }
    } else {
      const qty =
        atLocation
          .filter((i) => !i.subVariationId)
          .reduce((s, i) => s + i.quantity, 0) ||
        (v as { stockQuantity?: number }).stockQuantity ||
        0;
      if (qty > 0) {
        rows.push({ variation: v, subVariation: null, quantity: qty });
      }
    }
  }
  return rows;
}

interface EditSaleFormProps {
  sale: Sale;
  onSubmit: (data: EditSaleData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function EditSaleForm({
  sale,
  onSubmit,
  onCancel,
  isLoading,
}: EditSaleFormProps) {
  const [items, setItems] = useState<EditableItem[]>(() =>
    (sale.items ?? []).map(saleItemToEditable),
  );
  const [notes, setNotes] = useState(sale.notes ?? "");
  const [editReason, setEditReason] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const debouncedProductSearch = useDebounce(productSearch, 300);
  const [inventoryResults, setInventoryResults] = useState<
    LocationInventoryItem[]
  >([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    setItems((sale.items ?? []).map(saleItemToEditable));
    setNotes(sale.notes ?? "");
  }, [sale]);

  useEffect(() => {
    if (!sale.locationId || !debouncedProductSearch.trim()) {
      setInventoryResults([]);
      setDropdownOpen(false);
      return;
    }
    setInventoryLoading(true);
    getLocationInventory(sale.locationId, {
      search: debouncedProductSearch.trim(),
      limit: 3,
    })
      .then((res) => {
        const list = (res.data ?? []).filter((item) => item.quantity > 0);
        setInventoryResults(list);
        setDropdownOpen(list.length > 0);
      })
      .catch(() => {
        setInventoryResults([]);
        setDropdownOpen(false);
      })
      .finally(() => setInventoryLoading(false));
  }, [sale.locationId, debouncedProductSearch]);

  const handleQuantityChange = (index: number, delta: number) => {
    const newItems = [...items];
    const item = newItems[index];
    if (!item) return;
    const newQuantity = Math.max(
      1,
      Math.min(item.maxQuantity, item.quantity + delta),
    );
    newItems[index] = { ...item, quantity: newQuantity };
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleAddByIms = async () => {
    const term = productSearch.trim();
    if (!term || !sale.locationId) return;
    setScanLoading(true);
    setScannedProduct(null);
    setDropdownOpen(false);
    try {
      const product = await getProductByImsCode(term, {
        locationId: sale.locationId,
      });
      setScannedProduct(product);
      setProductSearch("");
    } catch {
      setScannedProduct(null);
    } finally {
      setScanLoading(false);
    }
  };

  const handleAddFromInventory = (invItem: LocationInventoryItem) => {
    const subVariationId = invItem.subVariationId ?? null;
    const existingIndex = items.findIndex(
      (i) =>
        i.variationId === invItem.variationId &&
        (i.subVariationId ?? null) === subVariationId,
    );
    const productName = invItem.variation.product.name ?? "—";
    const imsCode = invItem.variation.product.imsCode ?? "";
    const unitPrice = Number(invItem.variation.product.mrp ?? 0);
    const maxQty = invItem.quantity;

    if (existingIndex !== -1) {
      const newItems = [...items];
      const item = newItems[existingIndex];
      if (item && item.quantity < maxQty) {
        newItems[existingIndex] = {
          ...item,
          quantity: item.quantity + 1,
          maxQuantity: maxQty,
        };
        setItems(newItems);
      }
    } else {
      setItems([
        ...items,
        {
          variationId: invItem.variationId,
          subVariationId,
          quantity: 1,
          productName,
          imsCode,
          unitPrice,
          maxQuantity: maxQty,
        },
      ]);
    }
    setProductSearch("");
    setInventoryResults([]);
    setDropdownOpen(false);
  };

  const handleAddVariation = async (
    variation: ProductVariationItem,
    subVariation: { id: string; name: string } | null,
    maxQty: number,
  ) => {
    const product = scannedProduct;
    if (!product) return;
    const existingIndex = items.findIndex(
      (i) =>
        i.variationId === variation.id &&
        (i.subVariationId ?? null) === (subVariation?.id ?? null),
    );
    if (existingIndex !== -1) {
      const newItems = [...items];
      const item = newItems[existingIndex];
      if (item && item.quantity < maxQty) {
        item.quantity += 1;
        item.maxQuantity = maxQty;
        setItems(newItems);
      }
      setScannedProduct(null);
      return;
    }
    const productName = product.name;
    const imsCode = product.imsCode ?? "";
    setItems([
      ...items,
      {
        variationId: variation.id,
        subVariationId: subVariation?.id ?? null,
        quantity: 1,
        productName,
        imsCode,
        unitPrice: Number(product.mrp),
        maxQuantity: maxQty,
      },
    ]);
    setScannedProduct(null);
  };

  const handleSubmit = async () => {
    if (items.length === 0) return;
    const payload: EditSaleData = {
      items: items.map(
        (i): CreateSaleItem => ({
          variationId: i.variationId,
          subVariationId: i.subVariationId ?? undefined,
          quantity: i.quantity,
        }),
      ),
      notes: notes.trim() || undefined,
      editReason: editReason.trim() || undefined,
    };
    if (sale.isCreditSale && sale.payments && sale.payments.length > 0) {
      payload.payments = sale.payments.map((p) => ({
        method: p.method,
        amount: Number(p.amount),
      }));
    }
    await onSubmit(payload);
  };

  const addableRows = scannedProduct
    ? getAddableRowsFromProduct(scannedProduct, sale.locationId)
    : [];

  const showDropdown =
    productSearch.trim() !== "" &&
    (inventoryResults.length > 0 || inventoryLoading);

  return (
    <div className="space-y-4">
      <div>
        <Label>Items</Label>
        <div className="mt-2 flex gap-2 relative">
          <div className="relative flex-1">
            <Label htmlFor="edit-sale-product-search" className="sr-only">
              Search products to add by name, product code, or category
            </Label>
            <Input
              id="edit-sale-product-search"
              title="Search products to add by name, product code, or category"
              placeholder="Search by product name, product code, or category..."
              value={productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                if (!e.target.value.trim()) setDropdownOpen(false);
              }}
              onKeyDown={(e) =>
                e.key === "Enter" && (e.preventDefault(), handleAddByIms())
              }
              onFocus={() =>
                debouncedProductSearch.trim() &&
                inventoryResults.length > 0 &&
                setDropdownOpen(true)
              }
              onBlur={() => {
                setTimeout(() => setDropdownOpen(false), 150);
              }}
              aria-expanded={showDropdown && dropdownOpen}
              aria-haspopup="listbox"
              aria-autocomplete="list"
            />
            {showDropdown && dropdownOpen && (
              <div
                className="absolute z-10 mt-1 w-full rounded-md border bg-popover py-1 shadow-md max-h-[200px] overflow-auto"
                role="listbox"
              >
                {inventoryLoading ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching…
                  </div>
                ) : (
                  inventoryResults.slice(0, 3).map((invItem) => (
                    <div
                      key={`${invItem.variationId}-${invItem.subVariationId ?? "x"}`}
                      role="option"
                      className="cursor-pointer px-3 py-2 text-sm hover:bg-accent focus:bg-accent focus:outline-none"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleAddFromInventory(invItem);
                      }}
                    >
                      <div className="font-medium">
                        {invItem.variation.product.name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{invItem.variation.product.imsCode ?? "—"}</span>
                        <span>·</span>
                        <span>Stock: {invItem.quantity}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAddByIms}
            disabled={scanLoading || !productSearch.trim()}
            title="Search by product code (barcode)"
          >
            {scanLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
        {scannedProduct && (
          <div className="mt-2 rounded-md border p-2">
            <p className="text-sm font-medium">{scannedProduct.name}</p>
            {addableRows.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No stock at this location
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {addableRows.map((row, idx) => (
                  <Button
                    key={idx}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      handleAddVariation(
                        row.variation,
                        row.subVariation,
                        row.quantity,
                      )
                    }
                  >
                    {(
                      row.variation as {
                        attributes?: Array<{
                          attributeValue?: { value: string };
                        }>;
                      }
                    ).attributes
                      ?.map((a) => a.attributeValue?.value)
                      .filter(Boolean)
                      .join(" / ") ?? "Default"}{" "}
                    (×{row.quantity})
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="w-24 text-center">Qty</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow
                key={`${item.variationId}-${item.subVariationId ?? "x"}-${idx}`}
              >
                <TableCell>
                  <div>
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.imsCode}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(item.unitPrice)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleQuantityChange(idx, -1)}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="min-w-6 text-center">{item.quantity}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleQuantityChange(idx, 1)}
                      disabled={item.quantity >= item.maxQuantity}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleRemoveItem(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-notes">Notes</Label>
        <Textarea
          id="edit-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-reason">Edit reason (optional)</Label>
        <Textarea
          id="edit-reason"
          value={editReason}
          onChange={(e) => setEditReason(e.target.value)}
          placeholder="Why was this sale edited?"
          rows={2}
          maxLength={500}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={items.length === 0 || isLoading}
        >
          {isLoading ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
