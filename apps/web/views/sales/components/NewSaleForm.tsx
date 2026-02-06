"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { z } from "zod";
import { useDebounce } from "@/hooks/useDebounce";
import { useCheckMember } from "@/hooks/useMember";
import { useToast } from "@/hooks/useToast";
import {
  getLocationInventory,
  type LocationInventoryItem,
} from "@/services/inventoryService";
import api from "@/lib/axios";
import { type Location } from "@/services/locationService";
import { cn } from "@/lib/utils";
import {
  type CreateSaleData,
  type SalePreviewResponse,
  formatCurrency,
  previewSale,
} from "@/services/salesService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { FormSection } from "@/components/ui/form-section";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  User,
  ShoppingCart,
  Loader2,
} from "lucide-react";

// Zod schema for phone validation
const phoneSchema = z
  .string()
  .optional()
  .refine((val) => !val || /^\d+$/.test(val), {
    message: "Phone number must contain only digits",
  })
  .refine((val) => !val || val.length >= 10, {
    message: "Phone number must be at least 10 digits",
  });

interface ProductDiscount {
  id: string;
  name: string;
  value: number;
  valueType: "PERCENTAGE" | "FLAT";
  discountType: string;
  discountTypeId: string;
  startDate: string | null;
  endDate: string | null;
}

// Helper to format discount display
const formatDiscountLabel = (discount: ProductDiscount): string => {
  if (discount.valueType === "FLAT") {
    return `${discount.discountType} - ${formatCurrency(discount.value)}`;
  }
  return `${discount.discountType} - ${discount.value}%`;
};

/**
 * Pick the best discount for a member sale (matches backend logic):
 * eligible = types containing "member" or "non-member"; sort by Special first, then highest value.
 */
function getBestMemberDiscountId(
  discounts: ProductDiscount[],
  itemSubtotal: number,
): string | "none" {
  if (!discounts?.length) return "none";
  const eligible = discounts.filter((d) => {
    const typeName = (d.discountType ?? "").toLowerCase();
    return typeName.includes("member") || typeName.includes("non-member");
  });
  if (eligible.length === 0) return "none";
  const sorted = [...eligible].sort((a, b) => {
    const aIsSpecial =
      (a.discountType ?? "").toLowerCase() === "special" ? 1 : 0;
    const bIsSpecial =
      (b.discountType ?? "").toLowerCase() === "special" ? 1 : 0;
    if (aIsSpecial !== bIsSpecial) return bIsSpecial - aIsSpecial;
    const aValue =
      a.valueType === "FLAT"
        ? Number(a.value)
        : (Number(a.value) / 100) * itemSubtotal;
    const bValue =
      b.valueType === "FLAT"
        ? Number(b.value)
        : (Number(b.value) / 100) * itemSubtotal;
    return bValue - aValue;
  });
  return sorted[0]?.id ?? "none";
}

interface SaleItem {
  variationId: string;
  subVariationId?: string | null;
  subVariationName?: string;
  productName: string;
  color: string;
  imsCode: string;
  unitPrice: number;
  quantity: number;
  maxQuantity: number;
  promoCode?: string;
  selectedDiscountId?: string;
  availableDiscounts?: ProductDiscount[];
}

type PaymentMethod = "CASH" | "CARD" | "CHEQUE" | "FONEPAY" | "QR";

interface PaymentEntry {
  id: string;
  method: PaymentMethod;
  amount: number;
}

interface NewSaleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: Location[];
  onSubmit: (data: CreateSaleData) => Promise<void>;
  isLoading?: boolean;
  /** When true, render form only (no Dialog/trigger). For use on dedicated pages (e.g. mobile). */
  inline?: boolean;
}

export function NewSaleForm({
  open,
  onOpenChange,
  locations,
  onSubmit,
  isLoading,
  inline = false,
}: NewSaleFormProps) {
  // Form state
  const [locationId, setLocationId] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [memberName, setMemberName] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<SaleItem[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("CASH");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoCodeError, setPromoCodeError] = useState<string | null>(null);
  const [promoCodeValidating, setPromoCodeValidating] = useState(false);
  const debouncedPromoCode = useDebounce(promoCode, 2000);

  // Credit sale requires a member; clear credit sale if phone is cleared
  useEffect(() => {
    if (!memberPhone.trim() && isCreditSale) {
      setIsCreditSale(false);
    }
  }, [memberPhone, isCreditSale]);

  // Validate promo code when debounced value changes
  useEffect(() => {
    const validatePromoCode = async () => {
      if (!debouncedPromoCode.trim()) {
        setPromoCodeError(null);
        // Clear promo codes from all items
        setItems((prevItems) =>
          prevItems.map((item) => ({
            ...item,
            promoCode: undefined,
          })),
        );
        return;
      }

      if (items.length === 0) return;

      setPromoCodeValidating(true);
      setPromoCodeError(null);

      try {
        // Search for promo code using the search endpoint
        const response = await api.get<{
          message: string;
          data: Array<{
            id: string;
            code: string;
            isActive: boolean;
            products?: Array<{ productId: string }>;
          }>;
        }>(
          `/promos?search=${encodeURIComponent(debouncedPromoCode.trim())}&limit=1`,
        );

        const foundPromo = response.data.data?.find(
          (p) =>
            p.code.toLowerCase() === debouncedPromoCode.trim().toLowerCase(),
        );

        if (foundPromo) {
          if (!foundPromo.isActive) {
            setPromoCodeError("Promo code is not active");
            setItems((prevItems) =>
              prevItems.map((item) => ({
                ...item,
                promoCode: undefined,
              })),
            );
          } else {
            // Apply promo code to all items (backend will validate eligibility)
            setItems((prevItems) =>
              prevItems.map((item) => ({
                ...item,
                promoCode: debouncedPromoCode.trim(),
              })),
            );
            setPromoCodeError(null);
          }
        } else {
          setPromoCodeError("Promo code not found");
          setItems((prevItems) =>
            prevItems.map((item) => ({
              ...item,
              promoCode: undefined,
            })),
          );
        }
      } catch {
        setPromoCodeError("Error validating promo code");
        setItems((prevItems) =>
          prevItems.map((item) => ({
            ...item,
            promoCode: undefined,
          })),
        );
      } finally {
        setPromoCodeValidating(false);
      }
    };

    validatePromoCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedPromoCode]);

  // Discount mode: 'individual' (per product) or 'aggregate' (whole sale)
  const [discountMode, setDiscountMode] = useState<"individual" | "aggregate">(
    "individual",
  );
  const [aggregateDiscountId, setAggregateDiscountId] =
    useState<string>("none");
  const [aggregateDiscountAmount, setAggregateDiscountAmount] =
    useState<number>(0);

  // Inventory state
  const [inventory, setInventory] = useState<LocationInventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  // Member check
  const debouncedPhone = useDebounce(memberPhone, 500);
  const { data: memberCheck, isLoading: checkingMember } =
    useCheckMember(debouncedPhone);
  const { toast } = useToast();

  // Get showrooms only
  const showrooms = locations.filter((l) => l.type === "SHOWROOM");

  const completeSaleClickedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [previewResult, setPreviewResult] =
    useState<SalePreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Load inventory when location changes
  useEffect(() => {
    if (locationId) {
      setInventoryLoading(true);
      setItems([]); // Clear items when location changes
      getLocationInventory(locationId, { limit: 1000 })
        .then((res) => {
          setInventory(res.data.filter((item) => item.quantity > 0));
        })
        .catch(console.error)
        .finally(() => setInventoryLoading(false));
    } else {
      setInventory([]);
    }
  }, [locationId]);

  // When member is detected, auto-apply best eligible discount (matches backend logic)
  useEffect(() => {
    if (!memberCheck?.isMember || items.length === 0) return;
    setItems((prev) =>
      prev.map((item) => {
        if (!item.availableDiscounts?.length) return item;
        const itemSubtotal = item.unitPrice * item.quantity;
        const bestId = getBestMemberDiscountId(
          item.availableDiscounts,
          itemSubtotal,
        );
        if (bestId === "none") return item;
        return {
          ...item,
          selectedDiscountId: bestId,
        };
      }),
    );
  }, [memberCheck?.isMember, items.length]);

  // Fetch backend preview total (includes discount + promo) so payment matches exactly
  useEffect(() => {
    if (!locationId || items.length === 0) {
      setPreviewResult(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    previewSale({
      locationId,
      memberPhone: memberPhone.trim() || undefined,
      memberName: memberName.trim() || undefined,
      items: items.map((i) => ({
        variationId: i.variationId,
        subVariationId: i.subVariationId ?? undefined,
        quantity: i.quantity,
        promoCode: i.promoCode?.trim() || undefined,
      })),
    })
      .then((res) => {
        if (!cancelled) setPreviewResult(res);
      })
      .catch(() => {
        if (!cancelled) setPreviewResult(null);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locationId, memberPhone, memberName, items, items.length]);

  // Filter inventory by search - handles multi-word searches where words can match product OR variation
  // Example: "buddha red" matches products with "buddha" in name AND "red" in variation (order independent)
  const filteredInventory = useMemo(() => {
    if (!productSearch.trim()) return [];

    const searchTerms = productSearch
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter((term) => term.length > 0);

    if (searchTerms.length === 0) return [];

    return inventory.filter((item) => {
      const productName = item.variation.product.name.toLowerCase();
      const imsCode = item.variation.product.imsCode.toLowerCase();
      const color = item.variation.color.toLowerCase();
      const subVariationName = item.subVariation?.name?.toLowerCase() || "";
      const categoryName =
        item.variation.product.category?.name?.toLowerCase() || "";

      // Collect all searchable text fields
      const productFields = [productName, imsCode, categoryName].filter(
        Boolean,
      );
      const variationFields = [color, subVariationName].filter(Boolean);
      const allFields = [...productFields, ...variationFields];

      // For multi-word search: each word must match at least one field
      // Words can match product fields OR variation fields independently
      return searchTerms.every((term) => {
        // Check if this term matches any field
        return allFields.some((field) => field.includes(term));
      });
    });
  }, [inventory, productSearch]);

  // Add item to sale
  const handleAddItem = async (inventoryItem: LocationInventoryItem) => {
    // Match by (variationId, subVariationId) so sub-variants are separate lines
    const existingIndex = items.findIndex(
      (item) =>
        item.variationId === inventoryItem.variationId &&
        (item.subVariationId ?? null) ===
          (inventoryItem.subVariationId ?? null),
    );

    if (existingIndex !== -1) {
      // Increment quantity if not at max
      const existingItem = items[existingIndex];
      if (existingItem && existingItem.quantity < inventoryItem.quantity) {
        const newItems = [...items];
        const itemToUpdate = newItems[existingIndex];
        if (itemToUpdate) {
          itemToUpdate.quantity += 1;
          setItems(newItems);
        }
      }
      return;
    }

    // Fetch available discounts for this product
    const fetchProductDiscounts = async (productId: string) => {
      try {
        const response = await api.get<{
          message: string;
          discounts: Array<{
            id: string;
            name: string;
            value: number;
            valueType: "PERCENTAGE" | "FLAT";
            discountType: string;
            discountTypeId: string;
            startDate: string | null;
            endDate: string | null;
          }>;
        }>(`/products/${productId}/discounts`);
        return response.data.discounts || [];
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: { data?: { message?: string }; status?: number };
          message?: string;
        };
        const msg =
          axiosErr.response?.data?.message ??
          axiosErr.message ??
          "Unknown error";
        console.warn("Failed to fetch discounts for product:", productId, msg);
        return [];
      }
    };

    // Fetch discounts and add item
    const discounts = await fetchProductDiscounts(
      inventoryItem.variation.product.id,
    );
    // Auto-apply Member discount when customer is a member
    const memberDiscount = discounts.find(
      (d) => d.discountType?.toLowerCase() === "member",
    );
    const defaultDiscountId =
      memberCheck?.isMember && memberDiscount ? memberDiscount.id : "none";
    setItems([
      ...items,
      {
        variationId: inventoryItem.variationId,
        subVariationId: inventoryItem.subVariationId ?? undefined,
        subVariationName: inventoryItem.subVariation?.name,
        productName: inventoryItem.variation.product.name,
        color: inventoryItem.variation.color,
        imsCode: inventoryItem.variation.product.imsCode,
        unitPrice: Number(inventoryItem.variation.product.mrp),
        quantity: 1,
        maxQuantity: inventoryItem.quantity,
        selectedDiscountId: defaultDiscountId,
        availableDiscounts: discounts,
      },
    ]);
    setProductSearch(""); // Clear search after adding
  };

  // Update item quantity
  const handleQuantityChange = (index: number, delta: number) => {
    const newItems = [...items];
    const item = newItems[index];
    if (!item) return;
    const newQuantity = item.quantity + delta;
    if (newQuantity >= 1 && newQuantity <= item.maxQuantity) {
      item.quantity = newQuantity;
      setItems(newItems);
    }
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate item-level discounts (for individual mode)
  const calculateItemDiscount = (item: SaleItem): number => {
    if (discountMode === "aggregate") return 0;

    const itemSubtotal = item.unitPrice * item.quantity;

    if (item.selectedDiscountId && item.availableDiscounts) {
      const selectedDiscount = item.availableDiscounts.find(
        (d) => d.id === item.selectedDiscountId,
      );
      if (selectedDiscount) {
        if (selectedDiscount.valueType === "FLAT") {
          return Math.min(selectedDiscount.value, itemSubtotal);
        } else {
          return itemSubtotal * (selectedDiscount.value / 100);
        }
      }
    }

    return 0;
  };

  // Calculate totals (all rounded to 2 decimal places)
  const subtotal =
    Math.round(
      items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) *
        100,
    ) / 100;

  // Calculate total discount
  let totalDiscount = 0;
  if (discountMode === "aggregate") {
    if (aggregateDiscountAmount > 0) {
      // Ensure discount doesn't exceed subtotal
      totalDiscount =
        Math.round(Math.min(aggregateDiscountAmount, subtotal) * 100) / 100;
    } else if (aggregateDiscountId && aggregateDiscountId !== "none") {
      // This would be used if we have aggregate discount options from API
      // For now, we use the flat amount input
    }
  } else {
    totalDiscount =
      Math.round(
        items.reduce((sum, item) => sum + calculateItemDiscount(item), 0) * 100,
      ) / 100;
  }

  const finalTotal = Math.round((subtotal - totalDiscount) * 100) / 100;
  // Use backend preview total so payment always matches (includes promo + exact rounding)
  const expectedTotal = previewResult?.total ?? finalTotal;
  const totalPayment =
    Math.round(
      payments.reduce((sum, payment) => sum + payment.amount, 0) * 100,
    ) / 100;
  const remainingAmount =
    Math.round((expectedTotal - totalPayment) * 100) / 100;

  // Payment handlers
  const handleAddPayment = () => {
    const amount = Number(paymentAmount);
    if (amount > 0) {
      const rounded = Math.round(amount * 100) / 100;
      setPayments([
        ...payments,
        {
          id: `${selectedPaymentMethod}-${Date.now()}`,
          method: selectedPaymentMethod,
          amount: rounded,
        },
      ]);
      setPaymentAmount("");
    }
  };

  const handleAddRemaining = () => {
    if (remainingAmount <= 0) return;
    setPayments([
      ...payments,
      {
        id: `${selectedPaymentMethod}-${Date.now()}`,
        method: selectedPaymentMethod,
        amount: remainingAmount,
      },
    ]);
    setPaymentAmount("");
  };

  const handleRemovePayment = (id: string) => {
    setPayments(payments.filter((p) => p.id !== id));
  };

  // Handle submit (only when Complete Sale was clicked; prevents Enter from submitting)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeSaleClickedRef.current) return;

    if (!locationId || items.length === 0) return;

    // Validate phone number if provided
    if (memberPhone.trim()) {
      const result = phoneSchema.safeParse(memberPhone.trim());
      if (!result.success) {
        setPhoneError(
          result.error.errors[0]?.message || "Invalid phone number",
        );
        toast({
          title: "Validation Error",
          description: "Please enter a valid phone number",
          variant: "destructive",
        });
        return;
      }
    }

    if (
      !isCreditSale &&
      (totalPayment <= 0 || Math.abs(totalPayment - expectedTotal) > 0.01)
    ) {
      toast({
        title: "Payment Error",
        description:
          "Payment total must match the order total (after discounts)",
        variant: "destructive",
      });
      return;
    }

    await onSubmit({
      locationId,
      memberPhone: memberPhone.trim() || undefined,
      memberName: memberName.trim() || undefined,
      items: items.map((item) => ({
        variationId: item.variationId,
        subVariationId: item.subVariationId ?? undefined,
        quantity: item.quantity,
        promoCode: item.promoCode?.trim() || undefined,
      })),
      notes: notes.trim() || undefined,
      payments: payments.map((p) => ({
        method: p.method,
        amount: Math.round(p.amount * 100) / 100,
      })),
      isCreditSale: isCreditSale || undefined,
    });

    // Reset form
    setLocationId("");
    setMemberPhone("");
    setPhoneError(null);
    setMemberName("");
    setNotes("");
    setItems([]);
    setProductSearch("");
    setPayments([]);
    setIsCreditSale(false);
    setSelectedPaymentMethod("CASH");
    setPaymentAmount("");
    setDiscountMode("individual");
    setAggregateDiscountId("none");
    setAggregateDiscountAmount(0);
    setPromoCode("");
    setPromoCodeError(null);
    setPreviewResult(null);
    completeSaleClickedRef.current = false;
  };

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      completeSaleClickedRef.current = false;
      setLocationId("");
      setMemberPhone("");
      setPhoneError(null);
      setMemberName("");
      setNotes("");
      setItems([]);
      setProductSearch("");
      setPayments([]);
      setIsCreditSale(false);
      setSelectedPaymentMethod("CASH");
      setPaymentAmount("");
      setDiscountMode("individual");
      setAggregateDiscountId("none");
      setAggregateDiscountAmount(0);
      setPromoCode("");
      setPromoCodeError(null);
      setPreviewResult(null);
    }
    onOpenChange(newOpen);
  };

  const formContent = (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col h-full overflow-hidden"
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        const target = e.target as HTMLElement;
        if (target.tagName === "TEXTAREA") return;
        if (
          target.tagName === "BUTTON" &&
          (target as HTMLButtonElement).type === "submit"
        )
          return;
        e.preventDefault();
      }}
    >
      {inline ? (
        <div className="px-6 pt-6 pb-4 shrink-0 border-b border-border/50 flex flex-col gap-2">
          <h1 className="text-2xl font-bold font-mono tracking-tight">
            NEW SALE
          </h1>
          <p className="text-muted-foreground text-sm">
            Record a sale from a showroom. Inventory will be deducted
            automatically.
          </p>
        </div>
      ) : (
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-border/50">
          <DialogTitle className="text-2xl font-bold font-mono tracking-tight">
            NEW SALE
          </DialogTitle>
          <DialogDescription>
            Record a sale from a showroom. Inventory will be deducted
            automatically.
          </DialogDescription>
        </DialogHeader>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-6">
            {/* Left Panel: Location, Customer, Products */}
            <div className="space-y-6">
              {/* Location & Customer Panel */}
              <div className="form-panel">
                <FormSection title="Location & Customer">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Showroom *
                      </Label>
                      <Select value={locationId} onValueChange={setLocationId}>
                        <SelectTrigger className="bg-surface border-border/50">
                          <SelectValue placeholder="Select showroom" />
                        </SelectTrigger>
                        <SelectContent>
                          {showrooms.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Customer Phone
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="tel"
                          value={memberPhone}
                          onChange={(e) => {
                            const v = e.target.value;
                            setMemberPhone(v);
                            if (v.trim()) {
                              const r = phoneSchema.safeParse(v.trim());
                              setPhoneError(
                                r.success
                                  ? null
                                  : (r.error.errors[0]?.message ?? "Invalid"),
                              );
                            } else setPhoneError(null);
                          }}
                          placeholder="9800000000"
                          className={cn(
                            "pl-9 bg-surface border-border/50",
                            phoneError && "border-destructive",
                          )}
                        />
                      </div>
                      {phoneError && (
                        <p className="text-xs text-destructive">{phoneError}</p>
                      )}
                      {memberPhone && !phoneError && (
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          {checkingMember ? (
                            <span className="text-xs text-muted-foreground">
                              Checking...
                            </span>
                          ) : memberCheck?.isMember ? (
                            <Badge className="bg-[#00FF94] text-[#0A0E27] text-xs font-mono font-bold uppercase px-2 py-0.5">
                              Member
                            </Badge>
                          ) : (
                            <Input
                              type="text"
                              value={memberName}
                              onChange={(e) => setMemberName(e.target.value)}
                              placeholder="Customer name (optional)"
                              className="h-8 text-sm bg-surface border-border/50"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <Checkbox
                      id="credit-sale"
                      checked={isCreditSale}
                      disabled={!memberPhone.trim()}
                      onCheckedChange={(c) => setIsCreditSale(c === true)}
                      className="border-border/50 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                    />
                    <Label
                      htmlFor="credit-sale"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Credit Sale (Pay Later)
                    </Label>
                  </div>
                  {!memberPhone.trim() && (
                    <p className="text-xs text-muted-foreground mt-2 ml-7">
                      Enter customer phone (member) to enable credit sale.
                    </p>
                  )}
                </FormSection>
              </div>

              {/* Products Search */}
              {locationId && (
                <div className="form-panel">
                  <FormSection title="Add Product">
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Search by product name, variation, color... (e.g., 'buddha red' or 'red buddha')"
                          className="pl-9"
                        />
                      </div>
                      {inventoryLoading ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : productSearch.trim() ? (
                        filteredInventory.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground border rounded-lg">
                            No products found. Try a different search term.
                          </div>
                        ) : (
                          <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                            {filteredInventory.map((inv) => {
                              const variantLabel = [
                                inv.variation.color,
                                inv.subVariation?.name,
                              ]
                                .filter(Boolean)
                                .join(" / ");
                              return (
                                <div
                                  key={inv.id}
                                  className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                                  onClick={() => {
                                    handleAddItem(inv);
                                    setProductSearch("");
                                  }}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm">
                                      {inv.variation.product.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                      {inv.variation.product.imsCode} •{" "}
                                      {variantLabel || "Default"}
                                      {inv.variation.product.category?.name && (
                                        <span className="ml-2">
                                          •{" "}
                                          {inv.variation.product.category.name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="ml-4 flex items-center gap-4 shrink-0">
                                    <div className="text-right">
                                      <div className="font-semibold text-sm">
                                        {formatCurrency(
                                          Number(inv.variation.product.mrp),
                                        )}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Stock: {inv.quantity}
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddItem(inv);
                                        setProductSearch("");
                                      }}
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      Add
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground border rounded-lg">
                          Start typing to search products and variations...
                        </div>
                      )}
                    </div>
                  </FormSection>
                </div>
              )}

              {/* Cart Panel */}
              <div className="form-panel flex flex-col">
                <FormSection title="Shopping Cart">
                  {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="text-muted-foreground text-sm">
                        Cart is empty
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Add products to get started
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Discount Mode */}
                      <div className="space-y-3 mb-4">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={
                              discountMode === "individual"
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => setDiscountMode("individual")}
                            className="flex-1 text-xs"
                          >
                            Per Item
                          </Button>
                          <Button
                            type="button"
                            variant={
                              discountMode === "aggregate"
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => setDiscountMode("aggregate")}
                            className="flex-1 text-xs"
                          >
                            Whole Sale
                          </Button>
                        </div>
                        {discountMode === "aggregate" && (
                          <div className="space-y-2 p-3 bg-muted/30 border rounded-lg">
                            <Label className="text-xs font-medium">
                              Aggregate Discount (Flat Amount)
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={aggregateDiscountAmount || ""}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setAggregateDiscountAmount(
                                    val >= 0 ? val : 0,
                                  );
                                }}
                                placeholder="0.00"
                                className="h-9"
                              />
                              {aggregateDiscountAmount > 0 && (
                                <div className="text-sm font-semibold text-green-600 whitespace-nowrap">
                                  -{formatCurrency(aggregateDiscountAmount)}
                                </div>
                              )}
                            </div>
                            {aggregateDiscountAmount > subtotal && (
                              <p className="text-xs text-destructive">
                                Discount cannot exceed subtotal
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Cart Items */}
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {items.map((item, index) => (
                          <div
                            key={`${item.variationId}-${item.subVariationId ?? "v"}-${index}`}
                            className="bg-muted/30 border rounded-lg p-4 space-y-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm">
                                  {item.productName}
                                </div>
                                <div className="text-xs text-muted-foreground font-mono mt-1">
                                  {item.imsCode} · {item.color}
                                  {item.subVariationName
                                    ? ` / ${item.subVariationName}`
                                    : ""}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 border-border/50"
                                onClick={() => handleQuantityChange(index, -1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-10 text-center font-mono font-semibold">
                                {item.quantity}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 border-border/50"
                                onClick={() => handleQuantityChange(index, 1)}
                                disabled={item.quantity >= item.maxQuantity}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>

                            {discountMode === "individual" &&
                              item.availableDiscounts &&
                              item.availableDiscounts.length > 0 && (
                                <Select
                                  value={item.selectedDiscountId ?? "none"}
                                  onValueChange={(value) => {
                                    const next = [...items];
                                    const row = next[index];
                                    if (row) row.selectedDiscountId = value;
                                    setItems(next);
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Select discount" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">
                                      No Discount
                                    </SelectItem>
                                    {item.availableDiscounts.map((d) => (
                                      <SelectItem key={d.id} value={d.id}>
                                        {formatDiscountLabel(d)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}

                            <div className="flex justify-between items-center pt-2 border-t">
                              <span className="text-xs text-muted-foreground">
                                Line Total
                              </span>
                              <div className="text-right">
                                <div className="font-bold font-mono">
                                  {formatCurrency(
                                    item.unitPrice * item.quantity,
                                  )}
                                </div>
                                {discountMode === "individual" &&
                                  calculateItemDiscount(item) > 0 && (
                                    <div className="text-xs text-green-600 font-mono">
                                      -
                                      {formatCurrency(
                                        calculateItemDiscount(item),
                                      )}
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </FormSection>
              </div>
            </div>

            {/* Right Panel: Payment, Summary */}
            {items.length > 0 && (
              <div className="space-y-6">
                <div className="form-panel flex flex-col">
                  {/* Promo Code */}
                  <FormSection title="Promo Code">
                    <div className="relative">
                      <Input
                        value={promoCode}
                        onChange={(e) =>
                          setPromoCode(e.target.value.toUpperCase())
                        }
                        placeholder="Enter promo code..."
                        className="uppercase"
                        disabled={promoCodeValidating}
                      />
                      {promoCodeValidating && (
                        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                      )}
                      {promoCode && !promoCodeError && !promoCodeValidating && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-green-600">
                          Applied
                        </span>
                      )}
                    </div>
                    {promoCodeError && (
                      <p className="text-xs text-destructive mt-2">
                        {promoCodeError}
                      </p>
                    )}
                  </FormSection>

                  {/* Payment */}
                  <FormSection title="Payment">
                    <div className="flex gap-2">
                      <Select
                        value={selectedPaymentMethod}
                        onValueChange={(v) =>
                          setSelectedPaymentMethod(v as PaymentMethod)
                        }
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="CARD">Card</SelectItem>
                          <SelectItem value="CHEQUE">Cheque</SelectItem>
                          <SelectItem value="FONEPAY">Fonepay</SelectItem>
                          <SelectItem value="QR">QR</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder={
                          remainingAmount > 0
                            ? `Remaining: ${formatCurrency(remainingAmount)}`
                            : "Amount..."
                        }
                        className="flex-1"
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          (e.preventDefault(), handleAddPayment())
                        }
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleAddPayment}
                        disabled={!paymentAmount || Number(paymentAmount) <= 0}
                      >
                        Add
                      </Button>
                      {remainingAmount > 0.01 && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddRemaining}
                        >
                          Pay Full
                        </Button>
                      )}
                    </div>
                    {payments.length > 0 && (
                      <div className="mt-3 space-y-2 max-h-[150px] overflow-y-auto">
                        {payments.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-2 bg-muted rounded border"
                          >
                            <Badge variant="outline" className="text-xs">
                              {p.method}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <span className="font-bold font-mono">
                                {formatCurrency(p.amount)}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemovePayment(p.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Total:{" "}
                      <span className="font-semibold font-mono">
                        {formatCurrency(totalPayment)}
                      </span>
                      {Math.abs(expectedTotal - totalPayment) > 0.01 && (
                        <span className="text-warning ml-1">
                          · Must match {formatCurrency(expectedTotal)}
                        </span>
                      )}
                    </p>
                  </FormSection>

                  {/* Summary */}
                  <div className="bg-muted/50 border rounded-lg p-4 mt-6 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-mono font-semibold">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Discount</span>
                        <span className="font-mono font-semibold text-green-600">
                          -{formatCurrency(totalDiscount)}
                        </span>
                      </div>
                    )}
                    {previewResult?.promoDiscount != null &&
                      previewResult.promoDiscount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Promo</span>
                          <span className="font-mono font-semibold text-green-600">
                            -{formatCurrency(previewResult.promoDiscount)}
                          </span>
                        </div>
                      )}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-semibold">Amount to Pay</span>
                      <span className="text-xl font-bold font-mono">
                        {previewLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          formatCurrency(expectedTotal)
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  <FormSection title="Notes" className="mt-6">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes for this sale..."
                      rows={3}
                      className="resize-none"
                    />
                  </FormSection>

                  {/* Validation Error */}
                  {Math.abs(expectedTotal - totalPayment) > 0.01 &&
                    !isCreditSale && (
                      <div className="bg-destructive/10 border border-destructive rounded-lg p-3 text-sm text-destructive mt-4">
                        Payment mismatch: {formatCurrency(totalPayment)} paid,{" "}
                        {formatCurrency(expectedTotal)} required
                      </div>
                    )}

                  {/* Complete Sale Button */}
                  <Button
                    type="button"
                    disabled={
                      isLoading ||
                      !locationId ||
                      items.length === 0 ||
                      (!isCreditSale &&
                        (totalPayment <= 0 ||
                          Math.abs(totalPayment - expectedTotal) > 0.01))
                    }
                    className="w-full mt-6 font-semibold h-11"
                    onClick={() => {
                      completeSaleClickedRef.current = true;
                      formRef.current?.requestSubmit();
                    }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Complete Sale
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {!inline && (
        <div className="px-6 py-4 border-t border-border/50 shrink-0 bg-background flex justify-end gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      )}
    </form>
  );

  if (inline) {
    return (
      <div className="flex flex-col min-h-0 w-full max-w-4xl">
        {formContent}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Sale
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
