"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useDebounce } from "@/hooks/useDebounce";
import { useCheckMember } from "@/features/members";
import { useContactsPaginated } from "@/features/crm";
import { useToast } from "@/hooks/useToast";
import {
  getLocationInventory,
  type LocationInventoryItem,
} from "@/features/analytics";
import { searchPromoByCode } from "@/features/promos";
import {
  getProductDiscounts,
  getProductByImsCode,
  type Product,
} from "@/features/products";
import { type Location } from "@/features/locations";
import {
  type CreateSaleData,
  type SalePreviewResponse,
  formatCurrency,
  previewSale,
} from "../../services/sales.service";
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
  ShoppingCart,
  Loader2,
  UserRound,
  X,
} from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input";

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

/** Addable row from scanned product: (variation, subVariation?) with stock at location */
type AddableRow = {
  variation: NonNullable<Product["variations"]>[number];
  subVariation: { id: string; name: string } | null;
  quantity: number;
};

/**
 * Flatten product into addable rows for barcode scan.
 * For variations WITH sub-variations: one row per sub-variant that has stock.
 * For variations WITHOUT sub-variations: one row per variation.
 */
function getAddableRowsFromProduct(
  product: Product,
  _locationId: string,
): AddableRow[] {
  const rows: AddableRow[] = [];
  for (const v of product.variations ?? []) {
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
    // API already filters locationInventory by locationId; entries may not include location object
    const atLocation = locInv;
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
  imsCode: string;
  attributeLabel?: string;
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
  const [memberName, setMemberName] = useState("");
  const [contactId, setContactId] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState("");
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<SaleItem[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const cartItemsRef = useRef<HTMLDivElement>(null);
  const prevItemsLengthRef = useRef(items.length);
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("CASH");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoCodeError, setPromoCodeError] = useState<string | null>(null);
  const [promoCodeValidating, setPromoCodeValidating] = useState(false);
  const debouncedPromoCode = useDebounce(promoCode, 2000);

  // Contact search (200ms debounce) — must be before auto-fill effect
  const debouncedContactSearch = useDebounce(contactSearch, 200);
  const { data: contactsResult } = useContactsPaginated({
    search: debouncedContactSearch,
    limit: 10,
  });
  const contactOptions = useMemo(
    () => contactsResult?.data ?? [],
    [contactsResult?.data],
  );

  // Auto-scroll cart to show newly added items (fix #281)
  useEffect(() => {
    if (items.length > prevItemsLengthRef.current) {
      cartItemsRef.current?.lastElementChild?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
    prevItemsLengthRef.current = items.length;
  }, [items.length]);

  // Credit sale requires member or contact; clear credit sale if both are cleared
  useEffect(() => {
    if (!memberPhone.trim() && !contactId && isCreditSale) {
      setIsCreditSale(false);
    }
  }, [memberPhone, contactId, isCreditSale]);

  // When contact is selected, auto-fill phone and name from contact
  useEffect(() => {
    if (contactId && contactOptions.length > 0) {
      const c = contactOptions.find((x) => x.id === contactId);
      if (c) {
        const phone = c.member?.phone ?? c.phone ?? "";
        const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
        if (phone) setMemberPhone(phone);
        if (name) setMemberName(name);
      }
    }
  }, [contactId, contactOptions]);

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
        const foundPromo = await searchPromoByCode(debouncedPromoCode.trim());

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
  const [_aggregateDiscountId, setAggregateDiscountId] =
    useState<string>("none");
  const [aggregateDiscountAmount, setAggregateDiscountAmount] =
    useState<number>(0);

  // Inventory state
  const [inventory, setInventory] = useState<LocationInventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [scanLoading, setScanLoading] = useState(false);

  // Member check
  const debouncedPhone = useDebounce(memberPhone, 500);
  const { data: memberCheck, isLoading: checkingMember } =
    useCheckMember(debouncedPhone);

  const { toast } = useToast();

  // Get showrooms only (sales require a showroom location)
  const showrooms = locations.filter((l) => l.type === "SHOWROOM");
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;

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
      getLocationInventory(locationId, { limit: 10 })
        .then((res) => {
          setInventory(res.data.filter((item) => item.quantity > 0));
        })
        .catch((err) => {
          console.error(err);
          toast({
            title: "Failed to load inventory",
            description:
              err instanceof Error ? err.message : "Please try again.",
            variant: "destructive",
          });
          setInventory([]);
        })
        .finally(() => setInventoryLoading(false));
    } else {
      setInventory([]);
    }
  }, [locationId, toast]);

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
      contactId: contactId ?? undefined,
      items: items.map((i) => ({
        variationId: i.variationId,
        subVariationId: i.subVariationId ?? undefined,
        quantity: i.quantity,
        discountId:
          i.selectedDiscountId && i.selectedDiscountId !== "none"
            ? i.selectedDiscountId
            : undefined,
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
  }, [locationId, memberPhone, memberName, contactId, items, items.length]);

  // Filter inventory by search - handles multi-word searches where words can match product OR variation
  // Example: "buddha red" matches products with "buddha" in name AND "red" in variation (order independent)
  // When search is empty, show first 100 items for browsing
  const filteredInventory = useMemo(() => {
    if (!productSearch.trim()) return inventory.slice(0, 100);

    const searchTerms = productSearch
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter((term) => term.length > 0);

    if (searchTerms.length === 0) return [];

    return inventory.filter((item) => {
      const productName = item.variation.product.name.toLowerCase();
      const imsCode = (item.variation.product.imsCode ?? "").toLowerCase();
      const subVariationName = item.subVariation?.name?.toLowerCase() || "";
      const categoryName =
        item.variation.product.category?.name?.toLowerCase() || "";
      const attrValues = (item.variation.attributes ?? []).map((a) =>
        a.attributeValue.value.toLowerCase(),
      );

      const productFields = [productName, imsCode, categoryName].filter(
        Boolean,
      );
      const variationFields = [subVariationName, ...attrValues].filter(Boolean);
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
    const discounts = await getProductDiscounts(
      inventoryItem.variation.product.id,
    );
    // Auto-apply Member discount when customer is a member
    const memberDiscount = discounts.find(
      (d) => d.discountType?.toLowerCase() === "member",
    );
    const defaultDiscountId =
      memberCheck?.isMember && memberDiscount ? memberDiscount.id : "none";
    const attrLabel =
      inventoryItem.variation.attributes
        ?.map((a) => a.attributeValue.value)
        .join(" / ") || "";
    const validPromo =
      !promoCodeError && debouncedPromoCode.trim()
        ? debouncedPromoCode.trim()
        : undefined;
    setItems([
      ...items,
      {
        variationId: inventoryItem.variationId,
        subVariationId: inventoryItem.subVariationId ?? undefined,
        subVariationName: inventoryItem.subVariation?.name,
        productName: inventoryItem.variation.product.name,
        imsCode: inventoryItem.variation.product.imsCode ?? "",
        attributeLabel: attrLabel,
        unitPrice: Number(inventoryItem.variation.product.mrp),
        quantity: 1,
        maxQuantity: inventoryItem.quantity,
        selectedDiscountId: defaultDiscountId,
        availableDiscounts: discounts,
        promoCode: validPromo,
      },
    ]);
    setProductSearch(""); // Clear search after adding
  };

  // Barcode scan: GET /products/by-ims → show product + variations, add by variation
  const handleBarcodeScan = async () => {
    const term = productSearch.trim();
    if (!locationId || !term || term.includes(" ")) return;
    setScanLoading(true);
    setScannedProduct(null);
    try {
      const product = await getProductByImsCode(term, { locationId });
      setScannedProduct(product);
      setProductSearch("");
    } catch {
      // 404 or error: leave scannedProduct null; filtered list still shows results
    } finally {
      setScanLoading(false);
    }
  };

  type ProductVariationItem = NonNullable<Product["variations"]>[number];

  const getVariationLabel = (v: ProductVariationItem | undefined): string => {
    if (!v) return "—";
    const attrs = (
      v as { attributes?: Array<{ attributeValue?: { value: string } }> }
    ).attributes
      ?.map((a) => a.attributeValue?.value)
      .filter(Boolean);
    return attrs?.length ? attrs.join(" / ") : "—";
  };

  const handleAddVariationFromScan = async (
    product: Product,
    variation: ProductVariationItem,
    subVariation: { id: string; name: string } | null,
    maxQty: number,
  ) => {
    const existingIndex = items.findIndex(
      (item) =>
        item.variationId === variation.id &&
        (item.subVariationId ?? null) === (subVariation?.id ?? null),
    );
    if (existingIndex !== -1) {
      const existingItem = items[existingIndex];
      if (existingItem && existingItem.quantity < maxQty) {
        const newItems = [...items];
        const itemToUpdate = newItems[existingIndex];
        if (itemToUpdate) {
          itemToUpdate.quantity += 1;
          itemToUpdate.maxQuantity = maxQty;
          setItems(newItems);
        }
      }
      return;
    }
    const discounts = await getProductDiscounts(product.id);
    const memberDiscount = discounts.find(
      (d) => d.discountType?.toLowerCase() === "member",
    );
    const defaultDiscountId =
      memberCheck?.isMember && memberDiscount ? memberDiscount.id : "none";
    const attrLabel = getVariationLabel(variation);
    const subLabel = subVariation?.name;
    const displayLabel = [attrLabel !== "—" ? attrLabel : null, subLabel]
      .filter(Boolean)
      .join(" / ");
    const validPromo =
      !promoCodeError && debouncedPromoCode.trim()
        ? debouncedPromoCode.trim()
        : undefined;
    setItems([
      ...items,
      {
        variationId: variation.id,
        subVariationId: subVariation?.id ?? undefined,
        subVariationName: subVariation?.name,
        productName: product.name,
        imsCode: product.imsCode ?? "",
        attributeLabel: displayLabel || undefined,
        unitPrice: Number(product.mrp),
        quantity: 1,
        maxQuantity: maxQty,
        selectedDiscountId: defaultDiscountId,
        availableDiscounts: discounts,
        promoCode: validPromo,
      },
    ]);
    setScannedProduct(null);
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

  // All totals come from the backend preview for consistency
  const subtotal =
    previewResult?.subtotal ??
    Math.round(
      items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) *
        100,
    ) / 100;
  const totalDiscount = previewResult?.discount ?? 0;
  const promoDiscount = previewResult?.promoDiscount ?? 0;
  const expectedTotal =
    previewResult?.total ??
    Math.max(
      0,
      Math.round((subtotal - totalDiscount - promoDiscount) * 100) / 100,
    );

  const getItemDiscountDisplay = (item: SaleItem): number => {
    if (
      discountMode !== "individual" ||
      !item.selectedDiscountId ||
      item.selectedDiscountId === "none"
    )
      return 0;
    const disc = item.availableDiscounts?.find(
      (d) => d.id === item.selectedDiscountId,
    );
    if (!disc) return 0;
    const itemSub = item.unitPrice * item.quantity;
    return disc.valueType === "FLAT"
      ? Math.min(disc.value, itemSub)
      : itemSub * (disc.value / 100);
  };

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

    const submittedPhone = memberPhone.trim() || undefined;

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
      memberPhone: submittedPhone,
      memberName: memberName.trim() || undefined,
      contactId: contactId || undefined,
      items: items.map((item) => ({
        variationId: item.variationId,
        subVariationId: item.subVariationId ?? undefined,
        quantity: item.quantity,
        discountId:
          item.selectedDiscountId && item.selectedDiscountId !== "none"
            ? item.selectedDiscountId
            : undefined,
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
    setMemberName("");
    setContactId(null);
    setContactSearch("");
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
      setMemberName("");
      setContactId(null);
      setContactSearch("");
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

      {locations.length === 0 || showrooms.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <p className="text-muted-foreground mb-4">
            {locations.length === 0
              ? "You need at least one location to create sales. Complete setup or add a warehouse or showroom in Locations."
              : "You need at least one showroom to create sales. Add a showroom in Locations."}
          </p>
          <Link
            href={
              locations.length === 0
                ? `${basePath}/onboarding`
                : `${basePath}/locations/new`
            }
            className="text-primary underline hover:no-underline font-medium"
          >
            {locations.length === 0 ? "Complete setup" : "Add location"}
          </Link>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_520px] gap-6">
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
                        <Select
                          value={locationId}
                          onValueChange={setLocationId}
                        >
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

                      {/* CRM Contact (primary customer selection) */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <UserRound className="h-3 w-3" />
                          Customer (Contact)
                        </Label>
                        {contactId ? (
                          <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/40 text-sm">
                            <UserRound className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="flex-1 truncate">
                              {contactOptions.find((c) => c.id === contactId)
                                ? `${contactOptions.find((c) => c.id === contactId)!.firstName}${contactOptions.find((c) => c.id === contactId)!.lastName ? ` ${contactOptions.find((c) => c.id === contactId)!.lastName}` : ""}`
                                : "Contact linked"}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setContactId(null);
                                setContactSearch("");
                              }}
                              aria-label="Remove contact"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              value={contactSearch}
                              onChange={(e) => {
                                setContactSearch(e.target.value);
                                setShowContactDropdown(true);
                              }}
                              onFocus={() => setShowContactDropdown(true)}
                              onBlur={() =>
                                setTimeout(
                                  () => setShowContactDropdown(false),
                                  200,
                                )
                              }
                              placeholder="Search contacts by name, email, phone..."
                              className="pl-9 bg-surface border-border/50"
                            />
                            {showContactDropdown && (
                              <div className="absolute z-50 top-full mt-1 w-full bg-background border rounded-md shadow-md max-h-48 overflow-y-auto">
                                {contactOptions.length === 0 ? (
                                  <div className="p-3 text-sm text-muted-foreground text-center">
                                    No contacts found
                                  </div>
                                ) : (
                                  contactOptions.map((c) => (
                                    <button
                                      key={c.id}
                                      type="button"
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex flex-col"
                                      onMouseDown={() => {
                                        setContactId(c.id);
                                        setContactSearch("");
                                        setShowContactDropdown(false);
                                      }}
                                    >
                                      <span className="font-medium">
                                        {c.firstName}
                                        {c.lastName ? ` ${c.lastName}` : ""}
                                      </span>
                                      {(c.email || c.phone) && (
                                        <span className="text-xs text-muted-foreground">
                                          {c.email ?? c.phone}
                                        </span>
                                      )}
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Phone (walk-in or from contact) */}
                    <div className="mt-4 space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Phone (optional — for walk-in or member lookup)
                      </Label>
                      <PhoneInput
                        value={memberPhone}
                        onChange={setMemberPhone}
                        numberInputId="customer-phone"
                        placeholder="e.g. 9800000000"
                        className="[&_input]:bg-surface [&_input]:border-border/50"
                      />
                      {memberPhone && (
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

                    <div className="flex items-center gap-3 mt-4">
                      <Checkbox
                        id="credit-sale"
                        checked={isCreditSale}
                        disabled={!memberPhone.trim() && !contactId}
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
                    {!memberPhone.trim() && !contactId && (
                      <p className="text-xs text-muted-foreground mt-2 ml-7">
                        Select a contact or enter customer phone to enable
                        credit sale.
                      </p>
                    )}
                  </FormSection>
                </div>

                {/* Products Search */}
                <div className="form-panel">
                  <FormSection title="Add Product">
                    {!locationId ? (
                      <p className="text-sm text-muted-foreground py-4">
                        Select a showroom above to add products.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={productSearch}
                            onChange={(e) => {
                              setProductSearch(e.target.value);
                              if (scannedProduct) setScannedProduct(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleBarcodeScan();
                              }
                            }}
                            placeholder="Search by product name, IMS code (barcode), category..."
                            className="pl-9"
                          />
                        </div>
                        {scanLoading && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Looking up barcode…
                          </div>
                        )}
                        {scannedProduct && (
                          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">
                                Scanned: {scannedProduct.name}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setScannedProduct(null)}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Clear
                              </Button>
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {scannedProduct.imsCode}
                            </div>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                              {(() => {
                                const addableRows = getAddableRowsFromProduct(
                                  scannedProduct,
                                  locationId,
                                );
                                if (addableRows.length === 0) {
                                  return (
                                    <p className="text-sm text-muted-foreground py-2">
                                      No stock at this location
                                    </p>
                                  );
                                }
                                return addableRows.map((row, idx) => {
                                  const label = getVariationLabel(
                                    row.variation,
                                  );
                                  const subLabel = row.subVariation?.name;
                                  const displayLabel =
                                    [
                                      label !== "—" ? label : "Default",
                                      subLabel,
                                    ]
                                      .filter(Boolean)
                                      .join(" / ") || "Default";
                                  return (
                                    <div
                                      key={`${row.variation.id}-${row.subVariation?.id ?? "v"}-${idx}`}
                                      className="flex items-center justify-between py-1.5 px-2 rounded bg-background border text-sm"
                                    >
                                      <span>
                                        {displayLabel}
                                        <span className="text-muted-foreground text-xs ml-2">
                                          Stock: {row.quantity}
                                        </span>
                                      </span>
                                      <Button
                                        type="button"
                                        size="sm"
                                        disabled={row.quantity < 1}
                                        onClick={() =>
                                          handleAddVariationFromScan(
                                            scannedProduct,
                                            row.variation,
                                            row.subVariation,
                                            row.quantity,
                                          )
                                        }
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add
                                      </Button>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}
                        {inventoryLoading ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : filteredInventory.length === 0 ? (
                          productSearch.trim() ? (
                            <div className="p-4 text-center text-sm text-muted-foreground border rounded-lg">
                              No products found. Try a different search term.
                            </div>
                          ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground border rounded-lg">
                              No products in stock at this location.
                            </div>
                          )
                        ) : (
                          <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                            {filteredInventory.map((inv) => {
                              const attrLabel =
                                inv.variation.attributes
                                  ?.map((a) => a.attributeValue.value)
                                  .join(" / ") || "";
                              const variantLabel = [
                                attrLabel,
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
                                      {variantLabel && (
                                        <span className="text-muted-foreground font-normal ml-1.5">
                                          — {variantLabel}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                      {inv.variation.product.imsCode}
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
                        )}
                      </div>
                    )}
                  </FormSection>
                </div>
              </div>

              {/* Right Panel: Cart, Summary, Promo, Payment — always visible to prevent layout shift */}
              <div className="space-y-6 lg:sticky lg:top-4 lg:self-start">
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
                        <div
                          ref={cartItemsRef}
                          className="space-y-3 max-h-[400px] overflow-y-auto pr-2"
                        >
                          {items.map((item, index) => (
                            <div
                              key={`${item.variationId}-${item.subVariationId ?? "v"}-${index}`}
                              className="bg-muted/30 border rounded-lg p-4 space-y-3"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-sm">
                                    {item.productName}
                                    {item.attributeLabel && (
                                      <span className="text-muted-foreground font-normal ml-1.5">
                                        — {item.attributeLabel}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground font-mono mt-1">
                                    {item.imsCode}
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
                                  onClick={() =>
                                    handleQuantityChange(index, -1)
                                  }
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
                                    getItemDiscountDisplay(item) > 0 && (
                                      <div className="text-xs text-green-600 font-mono">
                                        -
                                        {formatCurrency(
                                          getItemDiscountDisplay(item),
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

                <div className="form-panel flex flex-col">
                  {/* Order Summary — placeholder when empty */}
                  <FormSection title="Order Summary">
                    {items.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        Add products to see total
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Subtotal
                          </span>
                          <span className="font-mono font-semibold">
                            {formatCurrency(subtotal)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Discount
                          </span>
                          <span className="font-mono font-semibold text-green-600">
                            -{formatCurrency(totalDiscount)}
                          </span>
                        </div>
                        {previewResult?.promoDiscount != null &&
                          previewResult.promoDiscount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Promo
                              </span>
                              <span className="font-mono font-semibold text-green-600">
                                -{formatCurrency(previewResult.promoDiscount)}
                              </span>
                            </div>
                          )}
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="font-semibold">Total</span>
                          <span className="text-xl font-bold font-mono">
                            {previewLoading ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              formatCurrency(expectedTotal)
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </FormSection>

                  {items.length > 0 && (
                    <>
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
                          {promoCode &&
                            !promoCodeError &&
                            !promoCodeValidating && (
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
                            disabled={
                              !paymentAmount || Number(paymentAmount) <= 0
                            }
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

                      {/* Notes */}
                      <FormSection title="Notes" className="mt-4">
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
                            Payment mismatch: {formatCurrency(totalPayment)}{" "}
                            paid, {formatCurrency(expectedTotal)} required
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
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
