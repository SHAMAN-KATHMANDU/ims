"use client";

import { useState, useEffect, useRef } from "react";
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
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  User,
  ShoppingCart,
  Loader2,
  CreditCard,
  FileText,
  Tag,
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
}

export function NewSaleForm({
  open,
  onOpenChange,
  locations,
  onSubmit,
  isLoading,
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

  const [activeTab, setActiveTab] = useState<
    "products" | "payment" | "details"
  >("products");
  const completeSaleClickedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [previewResult, setPreviewResult] = useState<SalePreviewResponse | null>(null);
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

  // Filter inventory by search
  const filteredInventory = inventory.filter((item) => {
    if (!productSearch) return true;
    const search = productSearch.toLowerCase();
    return (
      item.variation.product.name.toLowerCase().includes(search) ||
      item.variation.product.imsCode.toLowerCase().includes(search) ||
      item.variation.color.toLowerCase().includes(search)
    );
  });

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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Sale
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
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
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
            <DialogTitle>Create New Sale</DialogTitle>
            <DialogDescription>
              Record a sale from a showroom. Inventory will be deducted
              automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <Tabs
                value={activeTab}
                onValueChange={(v) =>
                  setActiveTab(v as "products" | "payment" | "details")
                }
                className="flex flex-col h-full overflow-hidden"
              >
                <TabsList className="grid w-full grid-cols-3 mx-6 mt-4 shrink-0">
                  <TabsTrigger value="products">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Products
                  </TabsTrigger>
                  <TabsTrigger value="payment" disabled={items.length === 0}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Payment
                  </TabsTrigger>
                  <TabsTrigger value="details" disabled={items.length === 0}>
                    <FileText className="h-4 w-4 mr-2" />
                    Details
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-hidden min-h-0 px-6 mt-4">
                  <ScrollArea className="h-full">
                    <TabsContent
                      value="products"
                      className="space-y-4 py-4 mt-0"
                    >
                      {/* Product Search and Add */}
                      {locationId && (
                        <div className="space-y-2">
                          <Label>Add Products</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              value={productSearch}
                              onChange={(e) => setProductSearch(e.target.value)}
                              placeholder="Search by product name, code, or color..."
                              className="pl-9"
                            />
                          </div>

                          {/* Available Products */}
                          {inventoryLoading ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                          ) : productSearch ? (
                            <div className="border rounded-md max-h-48 overflow-y-auto">
                              {filteredInventory.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground text-sm">
                                  No products found
                                </div>
                              ) : (
                                filteredInventory.slice(0, 10).map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                                    onClick={() => handleAddItem(item)}
                                  >
                                    <div>
                                      <div className="font-medium">
                                        {item.variation.product.name}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {item.variation.product.imsCode} -{" "}
                                        {item.variation.color}
                                        {item.subVariation?.name
                                          ? ` / ${item.subVariation.name}`
                                          : ""}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-medium">
                                        {formatCurrency(
                                          Number(item.variation.product.mrp),
                                        )}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        Stock: {item.quantity}
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          ) : null}
                        </div>
                      )}

                      {/* Discount Mode Selection */}
                      {items.length > 0 && (
                        <div className="space-y-2">
                          <Label>Discount Type</Label>
                          <RadioGroup
                            value={discountMode}
                            onValueChange={(value) =>
                              setDiscountMode(
                                value as "individual" | "aggregate",
                              )
                            }
                            className="flex gap-6"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="individual"
                                id="individual"
                              />
                              <Label
                                htmlFor="individual"
                                className="text-sm font-normal cursor-pointer"
                              >
                                Individual (Per Product)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="aggregate"
                                id="aggregate"
                              />
                              <Label
                                htmlFor="aggregate"
                                className="text-sm font-normal cursor-pointer"
                              >
                                Aggregate (Whole Sale)
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                      )}

                      {/* Aggregate Discount */}
                      {items.length > 0 && discountMode === "aggregate" && (
                        <div className="space-y-2 border rounded-md p-3 bg-muted/30">
                          <Label className="flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            Aggregate Discount
                          </Label>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Label className="text-xs text-muted-foreground">
                                Discount Amount (Flat)
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={aggregateDiscountAmount || ""}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setAggregateDiscountAmount(
                                    val >= 0 ? val : 0,
                                  );
                                  if (val > 0) {
                                    setAggregateDiscountId("none");
                                  }
                                }}
                                placeholder="0.00"
                                className="h-9"
                              />
                            </div>
                          </div>
                          {aggregateDiscountAmount > 0 && (
                            <div className="text-sm text-muted-foreground">
                              Discount:{" "}
                              {formatCurrency(aggregateDiscountAmount)}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Selected Items */}
                      {items.length > 0 && (
                        <div className="space-y-2">
                          <Label>
                            <ShoppingCart className="inline-block h-4 w-4 mr-1" />
                            Cart ({items.length} items)
                          </Label>
                          <div className="rounded-md border overflow-hidden">
                            <div
                              className={
                                discountMode === "aggregate"
                                  ? "max-h-[300px] overflow-y-auto"
                                  : "max-h-[350px] overflow-y-auto"
                              }
                            >
                              <div className="divide-y">
                                {items.map((item, index) => (
                                  <div
                                    key={`${item.variationId}-${item.subVariationId ?? "v"}-${index}`}
                                    className="flex items-start gap-1.5 p-2 w-full"
                                  >
                                    <div className="flex-1 min-w-0 overflow-hidden pr-1">
                                      {/* Name and Price side by side */}
                                      <div className="flex items-start justify-between gap-1.5 mb-1">
                                        <div className="flex-1 min-w-0 overflow-hidden">
                                          <div className="font-medium text-sm truncate">
                                            {item.productName}
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0 whitespace-nowrap pl-2">
                                          <div className="font-medium text-xs">
                                            {formatCurrency(
                                              item.unitPrice * item.quantity,
                                            )}
                                          </div>
                                          {discountMode === "individual" &&
                                            calculateItemDiscount(item) > 0 && (
                                              <div className="text-[10px] text-green-600">
                                                -{" "}
                                                {formatCurrency(
                                                  calculateItemDiscount(item),
                                                )}
                                              </div>
                                            )}
                                        </div>
                                      </div>
                                      {/* Code and Discount below */}
                                      <div className="space-y-0.5">
                                        <div className="text-[10px] text-muted-foreground truncate">
                                          {item.imsCode} - {item.color}
                                          {item.subVariationName
                                            ? ` / ${item.subVariationName}`
                                            : ""}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                          {formatCurrency(item.unitPrice)} x{" "}
                                          {item.quantity}
                                        </div>
                                        {discountMode === "individual" && (
                                          <div className="space-y-1.5 mt-1">
                                            {/* Available Discounts Table */}
                                            {item.availableDiscounts &&
                                              item.availableDiscounts.length >
                                                0 && (
                                                <div className="space-y-0.5">
                                                  <Label className="text-[10px] font-medium">
                                                    Available Discounts:
                                                  </Label>
                                                  <div className="border rounded-md overflow-hidden">
                                                    <Table>
                                                      <TableHeader>
                                                        <TableRow className="h-6">
                                                          <TableHead className="h-6 px-1.5 text-[10px]">
                                                            Type
                                                          </TableHead>
                                                          <TableHead className="h-6 px-1.5 text-[10px]">
                                                            Value
                                                          </TableHead>
                                                        </TableRow>
                                                      </TableHeader>
                                                      <TableBody>
                                                        {item.availableDiscounts.map(
                                                          (discount) => (
                                                            <TableRow
                                                              key={discount.id}
                                                              className="h-6"
                                                            >
                                                              <TableCell className="h-6 px-1.5 text-[10px]">
                                                                {
                                                                  discount.discountType
                                                                }
                                                              </TableCell>
                                                              <TableCell className="h-6 px-1.5 text-[10px]">
                                                                {discount.valueType ===
                                                                "FLAT"
                                                                  ? formatCurrency(
                                                                      discount.value,
                                                                    )
                                                                  : `${discount.value}%`}
                                                              </TableCell>
                                                            </TableRow>
                                                          ),
                                                        )}
                                                      </TableBody>
                                                    </Table>
                                                  </div>
                                                </div>
                                              )}
                                            {/* Discount Selection Dropdown */}
                                            <div className="flex items-center gap-1.5">
                                              <Label className="text-[10px] whitespace-nowrap">
                                                Select Discount:
                                              </Label>
                                              <Select
                                                value={
                                                  item.selectedDiscountId ||
                                                  "none"
                                                }
                                                onValueChange={(value) => {
                                                  const newItems = [...items];
                                                  newItems[index] = {
                                                    ...item,
                                                    selectedDiscountId: value,
                                                  };
                                                  setItems(newItems);
                                                }}
                                              >
                                                <SelectTrigger className="h-6 w-32 text-[10px]">
                                                  <SelectValue placeholder="Select discount" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="none">
                                                    No Discount
                                                  </SelectItem>
                                                  {item.availableDiscounts?.map(
                                                    (discount) => (
                                                      <SelectItem
                                                        key={discount.id}
                                                        value={discount.id}
                                                      >
                                                        {formatDiscountLabel(
                                                          discount,
                                                        )}
                                                      </SelectItem>
                                                    ),
                                                  )}
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-6 w-6 shrink-0"
                                        onClick={() =>
                                          handleQuantityChange(index, -1)
                                        }
                                        disabled={item.quantity <= 1}
                                      >
                                        <Minus className="h-2.5 w-2.5" />
                                      </Button>
                                      <span className="w-4 text-center text-[10px] shrink-0">
                                        {item.quantity}
                                      </span>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-6 w-6 shrink-0"
                                        onClick={() =>
                                          handleQuantityChange(index, 1)
                                        }
                                        disabled={
                                          item.quantity >= item.maxQuantity
                                        }
                                      >
                                        <Plus className="h-2.5 w-2.5" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive shrink-0"
                                        onClick={() => handleRemoveItem(index)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent
                      value="payment"
                      className="space-y-4 py-4 mt-0"
                    >
                      {/* Credit sale: pay later (members only) */}
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="credit-sale"
                            checked={isCreditSale}
                            disabled={!memberPhone.trim()}
                            onCheckedChange={(checked) =>
                              setIsCreditSale(checked === true)
                            }
                          />
                          <Label
                            htmlFor="credit-sale"
                            className={cn(
                              "text-sm font-normal",
                              memberPhone.trim()
                                ? "cursor-pointer"
                                : "cursor-not-allowed text-muted-foreground",
                            )}
                          >
                            This is a credit sale (pay later)
                          </Label>
                        </div>
                        {!memberPhone.trim() && (
                          <p className="text-xs text-muted-foreground pl-6">
                            Enter customer phone (member) to enable credit sale.
                          </p>
                        )}
                      </div>

                      {/* Promo first: apply then see amount to pay */}
                      {items.length > 0 && (
                        <div className="space-y-2">
                          <Label>Promo code (optional)</Label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Input
                                type="text"
                                autoComplete="off"
                                value={promoCode}
                                onChange={(e) => {
                                  setPromoCode(e.target.value.toUpperCase());
                                }}
                                placeholder="Enter promo code"
                                className="flex-1 uppercase"
                                disabled={promoCodeValidating}
                              />
                              {promoCodeValidating && (
                                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          {promoCodeError && (
                            <p className="text-xs text-destructive">
                              {promoCodeError}
                            </p>
                          )}
                          {promoCode &&
                            !promoCodeError &&
                            !promoCodeValidating && (
                              <p className="text-xs text-green-600">
                                ✓ Promo applied to all items
                              </p>
                            )}
                        </div>
                      )}

                      {/* Amount to pay (from server: discounts + promo) */}
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">
                            Subtotal
                          </span>
                          <span>{formatCurrency(subtotal)}</span>
                        </div>
                        {totalDiscount > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">
                              {memberCheck?.isMember
                                ? "Member discount"
                                : "Discount"}
                            </span>
                            <span className="text-green-600">
                              -{formatCurrency(totalDiscount)}
                            </span>
                          </div>
                        )}
                        {previewResult?.promoDiscount != null &&
                          previewResult.promoDiscount > 0 && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">
                                Promo discount
                              </span>
                              <span className="text-green-600">
                                -{formatCurrency(previewResult.promoDiscount)}
                              </span>
                            </div>
                          )}
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-sm font-medium">
                            Amount to pay
                            {previewResult && (
                              <span className="text-muted-foreground font-normal ml-1">
                                (incl. promo)
                              </span>
                            )}
                          </span>
                          <span className="text-lg font-semibold">
                            {previewLoading ? (
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            ) : (
                              formatCurrency(expectedTotal)
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Add Payment */}
                      <div className="space-y-3">
                        <Label>Add Payment</Label>
                        <div className="flex flex-wrap items-center gap-2">
                          <Select
                            value={selectedPaymentMethod}
                            onValueChange={(value) =>
                              setSelectedPaymentMethod(value as PaymentMethod)
                            }
                          >
                            <SelectTrigger className="w-[140px] h-9">
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
                            min="0"
                            step="0.01"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder={
                              remainingAmount > 0
                                ? `Remaining: ${formatCurrency(remainingAmount)}`
                                : "Amount"
                            }
                            className="flex-1 min-w-[120px] h-9"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddPayment();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={handleAddPayment}
                            disabled={
                              !paymentAmount || Number(paymentAmount) <= 0
                            }
                            className="h-9"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add
                          </Button>
                          {remainingAmount > 0.01 && (
                            <Button
                              type="button"
                              onClick={handleAddRemaining}
                              className="h-9"
                            >
                              Pay full ({formatCurrency(remainingAmount)})
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Final total (after discounts):{" "}
                          <span className="font-medium text-foreground">
                            {formatCurrency(expectedTotal)}
                          </span>
                          {isCreditSale
                            ? ". Credit sale: partial or no payment now; balance can be paid later."
                            : ". Payment total must match exactly."}
                        </p>
                      </div>

                      {/* Payment List */}
                      {payments.length > 0 && (
                        <div className="space-y-2">
                          <Label>Payments ({payments.length})</Label>
                          <div className="rounded-md border overflow-hidden">
                            <div className="max-h-[200px] overflow-y-auto">
                              <div className="divide-y">
                                {payments.map((payment) => (
                                  <div
                                    key={payment.id}
                                    className="flex items-center justify-between p-3"
                                  >
                                    <div className="flex items-center gap-3">
                                      <Badge variant="outline">
                                        {payment.method}
                                      </Badge>
                                      <span className="font-medium">
                                        {formatCurrency(payment.amount)}
                                      </span>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive"
                                      onClick={() =>
                                        handleRemovePayment(payment.id)
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Payment Summary */}
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Payment Total</span>
                          <span className="font-semibold">
                            {formatCurrency(totalPayment)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Remaining</span>
                          <span
                            className={
                              Math.abs(expectedTotal - totalPayment) < 0.01
                                ? "font-semibold text-green-600"
                                : "font-semibold text-orange-600"
                            }
                          >
                            {formatCurrency(expectedTotal - totalPayment)}
                          </span>
                        </div>
                        {Math.abs(expectedTotal - totalPayment) > 0.01 && (
                          <p className="text-xs text-muted-foreground">
                            Payment total must match Final Total (after
                            discounts)
                          </p>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent
                      value="details"
                      className="space-y-4 py-4 mt-0"
                    >
                      {/* Notes */}
                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                          id="notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add any notes about this sale..."
                          rows={6}
                        />
                      </div>

                      {/* Summary */}
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="text-sm font-medium mb-3">
                          Sale Summary
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Items</span>
                          <span>{items.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Total MRP</span>
                          <span>{formatCurrency(subtotal)}</span>
                        </div>
                        {totalDiscount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>
                              {memberCheck?.isMember
                                ? "Member discount"
                                : "Total Discount"}
                            </span>
                            <span className="text-green-600">
                              -{formatCurrency(totalDiscount)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span>Payment Methods</span>
                          <span>{payments.length}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                          <span>Total Payment</span>
                          <span>{formatCurrency(totalPayment)}</span>
                        </div>
                      </div>
                    </TabsContent>
                  </ScrollArea>
                </div>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="w-72 border-l bg-muted/30 flex flex-col shrink-0 overflow-hidden">
              <div className="p-4 border-b shrink-0">
                <h3 className="text-sm font-semibold">Sale Information</h3>
              </div>
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 space-y-4">
                  {/* Location Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="location">Showroom *</Label>
                    <Select value={locationId} onValueChange={setLocationId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a showroom" />
                      </SelectTrigger>
                      <SelectContent>
                        {showrooms.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Member Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="memberPhone">Customer Phone</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="memberPhone"
                        type="tel"
                        value={memberPhone}
                        onChange={(e) => {
                          const value = e.target.value;
                          setMemberPhone(value);
                          // Validate phone number
                          if (value.trim()) {
                            const result = phoneSchema.safeParse(value.trim());
                            if (!result.success) {
                              setPhoneError(
                                result.error.errors[0]?.message ||
                                  "Invalid phone number",
                              );
                            } else {
                              setPhoneError(null);
                            }
                          } else {
                            setPhoneError(null);
                          }
                        }}
                        placeholder="Enter phone"
                        className={
                          phoneError ? "pl-9 border-destructive" : "pl-9"
                        }
                      />
                    </div>
                    {phoneError && (
                      <p className="text-xs text-destructive">{phoneError}</p>
                    )}
                    {memberPhone && !phoneError && (
                      <div className="space-y-1">
                        {checkingMember ? (
                          <span className="text-xs text-muted-foreground">
                            Checking...
                          </span>
                        ) : memberCheck?.isMember ? (
                          <>
                            <Badge
                              variant="secondary"
                              className="bg-green-100 text-green-800 text-xs"
                            >
                              Member
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              {memberCheck.member?.name ||
                                memberCheck.member?.phone}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {totalDiscount > 0
                                ? `Member discount: ${formatCurrency(totalDiscount)}`
                                : "Member discount will apply"}
                            </div>
                          </>
                        ) : (
                          <div className="space-y-2">
                            <span className="text-xs text-muted-foreground">
                              Will be auto-registered
                            </span>
                            <div className="space-y-1">
                              <Label className="text-xs">
                                Customer Name (Optional)
                              </Label>
                              <Input
                                type="text"
                                value={memberName}
                                onChange={(e) => setMemberName(e.target.value)}
                                placeholder="Enter customer name"
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0 bg-background flex-row justify-between gap-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
              className="mr-0"
            >
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (activeTab === "details") setActiveTab("payment");
                  else if (activeTab === "payment") setActiveTab("products");
                }}
                disabled={activeTab === "products"}
                className="min-w-[90px]"
              >
                Previous
              </Button>
              {activeTab === "details" ? (
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
                  className="min-w-[140px]"
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
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    if (activeTab === "products") setActiveTab("payment");
                    else if (activeTab === "payment") setActiveTab("details");
                  }}
                  disabled={
                    (activeTab === "products" &&
                      (!locationId || items.length === 0)) ||
                    (activeTab === "payment" &&
                      !isCreditSale &&
                      (payments.length === 0 ||
                        totalPayment <= 0 ||
                        Math.abs(totalPayment - expectedTotal) > 0.01))
                  }
                  className="min-w-[90px]"
                >
                  Next
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
