"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/lib/format";
import {
  useAddDealLineItem,
  useRemoveDealLineItem,
  useConvertDealToSale,
} from "../../hooks/use-deals";
import { useProductsPaginated } from "@/features/products";
import { useActiveLocations } from "@/features/locations";
import type { Deal } from "../../services/deal.service";

interface DealLineItemsSectionProps {
  deal: Deal;
  basePath: string;
}

export function DealLineItemsSection({
  deal,
  basePath,
}: DealLineItemsSectionProps) {
  const [productOpen, setProductOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  const { toast } = useToast();
  const addLineItem = useAddDealLineItem(deal.id);
  const removeLineItem = useRemoveDealLineItem(deal.id);
  const convertToSale = useConvertDealToSale(deal.id);

  const { data: productsResponse } = useProductsPaginated({
    limit: 100,
    search: "",
  });
  const { data: locationsData } = useActiveLocations();
  const products = productsResponse?.data ?? [];
  const locations = locationsData ?? [];

  const lineItems = deal.lineItems ?? [];

  const handleAddProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const variation = product.variations?.[0];
    const unitPrice = Number(product.mrp ?? 0);
    addLineItem.mutate(
      {
        productId,
        variationId: variation?.id ?? undefined,
        quantity: 1,
        unitPrice,
      },
      {
        onSuccess: () => {
          setProductOpen(false);
          toast({ title: "Product added" });
        },
        onError: (err) => {
          toast({
            title: "Failed to add product",
            description: err.message,
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleRemoveLineItem = (lineItemId: string) => {
    removeLineItem.mutate(lineItemId, {
      onSuccess: () => toast({ title: "Line item removed" }),
      onError: (err) =>
        toast({
          title: "Failed to remove",
          description: err.message,
          variant: "destructive",
        }),
    });
  };

  const handleConvertToSale = () => {
    if (!selectedLocationId) {
      toast({
        title: "Select a location",
        variant: "destructive",
      });
      return;
    }
    convertToSale.mutate(selectedLocationId, {
      onSuccess: (data) => {
        setConvertOpen(false);
        setSelectedLocationId("");
        toast({
          title: "Sale created",
          description: `Sale ${data.sale.saleCode} created successfully`,
        });
        window.location.href = `${basePath}/sales`;
      },
      onError: (err) =>
        toast({
          title: "Failed to convert to sale",
          description: err.message,
          variant: "destructive",
        }),
    });
  };

  const isWon = deal.status === "WON";
  const canConvert = isWon && lineItems.length > 0 && locations.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Line Items</h3>
        <Popover open={productOpen} onOpenChange={setProductOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Add Product
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="end">
            <Command>
              <CommandInput placeholder="Search products..." />
              <CommandList>
                <CommandEmpty>No product found.</CommandEmpty>
                <CommandGroup>
                  {products.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={`${product.name} ${product.imsCode ?? ""}`}
                      onSelect={() => handleAddProduct(product.id)}
                    >
                      <div>
                        <div className="font-medium">{product.name}</div>
                        {product.imsCode && (
                          <div className="text-xs text-muted-foreground">
                            {product.imsCode}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {lineItems.length ? (
        <>
          {/* Mobile: stacked cards (table would force the page to scroll sideways) */}
          <div className="space-y-2 md:hidden">
            {lineItems.map((item) => (
              <div key={item.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium break-words">
                      {item.product?.name ?? "—"}
                    </p>
                    {item.product?.imsCode && (
                      <p className="text-muted-foreground text-xs">
                        {item.product.imsCode}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveLineItem(item.id)}
                    disabled={removeLineItem.isPending}
                    aria-label="Remove line item"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground text-xs">Qty</dt>
                    <dd>{item.quantity}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">
                      Unit Price
                    </dt>
                    <dd>{formatCurrency(Number(item.unitPrice))}</dd>
                  </div>
                  <div className="text-right">
                    <dt className="text-muted-foreground text-xs">Total</dt>
                    <dd className="font-medium">
                      {formatCurrency(Number(item.unitPrice) * item.quantity)}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/40">
                  <th className="text-left px-3 py-2.5 font-semibold text-foreground">
                    Product
                  </th>
                  <th className="text-right px-3 py-2.5 font-semibold text-foreground font-mono">
                    Qty
                  </th>
                  <th className="text-right px-3 py-2.5 font-semibold text-foreground font-mono">
                    Unit Price
                  </th>
                  <th className="text-right px-3 py-2.5 font-semibold text-foreground font-mono">
                    Total
                  </th>
                  <th className="w-10" aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-3 py-2">
                      {item.product?.name ?? "—"}
                      {item.product?.imsCode && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          ({item.product.imsCode})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {item.quantity}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatCurrency(Number(item.unitPrice))}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">
                      {formatCurrency(Number(item.unitPrice) * item.quantity)}
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveLineItem(item.id)}
                        disabled={removeLineItem.isPending}
                        aria-label="Remove line item"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {/* Total row */}
                <tr className="bg-secondary/20 border-t-2">
                  <td
                    colSpan={3}
                    className="px-3 py-2.5 text-right font-semibold"
                  >
                    Total
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-primary">
                    {formatCurrency(
                      lineItems.reduce(
                        (sum, item) =>
                          sum + Number(item.unitPrice) * item.quantity,
                        0,
                      ),
                    )}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-muted-foreground text-sm py-4">
          No products added. Add products to convert this deal to a sale when
          won.
        </p>
      )}

      {canConvert && (
        <Popover open={convertOpen} onOpenChange={setConvertOpen}>
          <PopoverTrigger asChild>
            <Button>Convert to Sale</Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] space-y-4" align="start">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select location for sale
              </label>
              <Select
                value={selectedLocationId}
                onValueChange={setSelectedLocationId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConvertOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConvertToSale}
                disabled={!selectedLocationId || convertToSale.isPending}
              >
                {convertToSale.isPending ? "Creating..." : "Create Sale"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
