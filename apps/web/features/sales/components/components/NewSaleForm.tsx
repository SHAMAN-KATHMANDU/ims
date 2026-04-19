"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { NewSaleFormSchema, type NewSaleFormInput } from "../../validation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  ShoppingCart,
  Loader2,
  UserRound,
  X,
  Lock,
  AlertCircle,
} from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input";
import { useTenantPaymentMethods } from "@/features/settings";

const DEFAULT_PAYMENT_METHODS = [
  { code: "CASH", label: "Cash", enabled: true, order: 0 },
  { code: "CARD", label: "Card", enabled: true, order: 1 },
  { code: "CHEQUE", label: "Cheque", enabled: true, order: 2 },
  { code: "FONEPAY", label: "Fonepay", enabled: true, order: 3 },
  { code: "QR", label: "QR", enabled: true, order: 4 },
] as const;

function SaleSection({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mb-6 last:mb-0", className)}>
      <h2 className="text-sm font-semibold text-foreground border-l-2 border-primary pl-3 mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

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
  /** Enterprise: manual discount percent (0–100) — overrides product discount */
  manualDiscountPercent?: number;
  /** Enterprise: manual discount amount — overrides product discount */
  manualDiscountAmount?: number;
  /** Required when manual discount is applied */
  discountReason?: string;
}

type PaymentMethod = string;

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
  const { data: paymentMethodsResult } = useTenantPaymentMethods();
  const enabledPaymentMethods = useMemo(() => {
    const methods =
      paymentMethodsResult?.paymentMethods ?? DEFAULT_PAYMENT_METHODS;
    return [...methods]
      .filter((method) => method.enabled)
      .sort((a, b) => a.order - b.order);
  }, [paymentMethodsResult?.paymentMethods]);
  const paymentMethodLabelMap = useMemo(
    () =>
      new Map(
        enabledPaymentMethods.map((method) => [method.code, method.label]),
      ),
    [enabledPaymentMethods],
  );

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
    useState<PaymentMethod>(enabledPaymentMethods[0]?.code ?? "CASH");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoCodeError, setPromoCodeError] = useState<string | null>(null);
  const [promoCodeValidating, setPromoCodeValidating] = useState(false);
  const debouncedPromoCode = useDebounce(promoCode, 2000);

  const validationForm = useForm<NewSaleFormInput>({
    resolver: zodResolver(NewSaleFormSchema),
    mode: "onBlur",
    defaultValues: { locationId: "", items: [] },
  });

  useEffect(() => {
    validationForm.setValue("locationId", locationId);
  }, [locationId, validationForm]);

  useEffect(() => {
    validationForm.setValue(
      "items",
      items.map((i) => ({
        variationId: i.variationId,
        subVariationId: i.subVariationId ?? null,
        quantity: i.quantity,
      })),
    );
  }, [items, validationForm]);

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

  // Inventory state — search-only: fetch only when user types (debounced)
  const [inventory, setInventory] = useState<LocationInventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const debouncedProductSearch = useDebounce(productSearch, 300);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);

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

  useEffect(() => {
    if (enabledPaymentMethods.length === 0) return;
    const selectedExists = enabledPaymentMethods.some(
      (method) => method.code === selectedPaymentMethod,
    );
    if (!selectedExists) {
      setSelectedPaymentMethod(enabledPaymentMethods[0]?.code ?? "CASH");
    }
  }, [enabledPaymentMethods, selectedPaymentMethod]);

  // Clear items, inventory, search when location changes
  const prevLocationIdRef = useRef(locationId);
  useEffect(() => {
    if (prevLocationIdRef.current !== locationId) {
      prevLocationIdRef.current = locationId;
      setItems([]);
      setInventory([]);
      setProductSearch("");
      setScannedProduct(null);
    }
  }, [locationId]);

  // Search-only: fetch inventory only when user types (debounced 300ms)
  useEffect(() => {
    if (!locationId || !debouncedProductSearch.trim()) {
      setInventory([]);
      return;
    }
    setInventoryLoading(true);
    getLocationInventory(locationId, {
      search: debouncedProductSearch.trim(),
      limit: 30,
    })
      .then((res) => {
        setInventory(res.data.filter((item) => item.quantity > 0));
      })
      .catch((err) => {
        console.error(err);
        toast({
          title: "Failed to search inventory",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
        setInventory([]);
      })
      .finally(() => setInventoryLoading(false));
  }, [locationId, debouncedProductSearch, toast]);

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
          !i.manualDiscountPercent &&
          !i.manualDiscountAmount &&
          i.selectedDiscountId &&
          i.selectedDiscountId !== "none"
            ? i.selectedDiscountId
            : undefined,
        promoCode: i.promoCode?.trim() || undefined,
        manualDiscountPercent:
          (i.manualDiscountPercent ?? 0) > 0
            ? i.manualDiscountPercent
            : undefined,
        manualDiscountAmount:
          (i.manualDiscountAmount ?? 0) > 0
            ? i.manualDiscountAmount
            : undefined,
        discountReason: i.discountReason?.trim() || undefined,
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

  // Inventory is already filtered by API when we pass search; no client-side filtering needed
  const filteredInventory = inventory;

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

  const getItemDiscountDisplay = (item: SaleItem): number => {
    if (discountMode !== "individual") return 0;
    const itemSub = item.unitPrice * item.quantity;
    if ((item.manualDiscountPercent ?? 0) > 0) {
      return Math.min(itemSub * (item.manualDiscountPercent! / 100), itemSub);
    }
    if ((item.manualDiscountAmount ?? 0) > 0) {
      return Math.min(item.manualDiscountAmount!, itemSub);
    }
    if (!item.selectedDiscountId || item.selectedDiscountId === "none")
      return 0;
    const disc = item.availableDiscounts?.find(
      (d) => d.id === item.selectedDiscountId,
    );
    if (!disc) return 0;
    return disc.valueType === "FLAT"
      ? Math.min(disc.value, itemSub)
      : itemSub * (disc.value / 100);
  };

  // All totals come from the backend preview for consistency
  const subtotal =
    previewResult?.subtotal ??
    Math.round(
      items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) *
        100,
    ) / 100;
  const totalDiscountAll = previewResult?.discount ?? 0;
  const promoDiscount = previewResult?.promoDiscount ?? 0;
  const localProductDiscountSum =
    Math.round(
      items.reduce((sum, item) => sum + getItemDiscountDisplay(item), 0) * 100,
    ) / 100;
  const productDiscountDisplay =
    previewResult != null
      ? previewResult.productDiscount != null
        ? previewResult.productDiscount
        : Math.max(
            0,
            Math.round((totalDiscountAll - promoDiscount) * 100) / 100,
          )
      : localProductDiscountSum;
  const expectedTotal =
    previewResult?.total ??
    Math.max(
      0,
      Math.round((subtotal - productDiscountDisplay - promoDiscount) * 100) /
        100,
    );

  const handleRemovePromo = () => {
    setPromoCode("");
    setPromoCodeError(null);
    setItems((prev) => prev.map((i) => ({ ...i, promoCode: undefined })));
  };

  const totalPayment =
    Math.round(
      payments.reduce((sum, payment) => sum + payment.amount, 0) * 100,
    ) / 100;
  const remainingAmount =
    Math.round((expectedTotal - totalPayment) * 100) / 100;

  // Credit + full payment: when isCreditSale but payments equal total, auto-uncheck credit
  useEffect(() => {
    if (
      isCreditSale &&
      payments.length > 0 &&
      expectedTotal > 0 &&
      Math.abs(totalPayment - expectedTotal) < 0.01
    ) {
      setIsCreditSale(false);
      toast({
        title: "Full payment detected",
        description:
          "Credit sale unchecked — payment total matches order total.",
      });
    }
  }, [isCreditSale, payments, totalPayment, expectedTotal, toast]);

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

    const isValid = await validationForm.trigger();
    if (!isValid) return;

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

    const manualDiscountWithoutReason = items.find(
      (i) =>
        ((i.manualDiscountPercent ?? 0) > 0 ||
          (i.manualDiscountAmount ?? 0) > 0) &&
        !(i.discountReason?.trim().length ?? 0),
    );
    if (manualDiscountWithoutReason) {
      toast({
        title: "Manual discount requires reason",
        description:
          "Enter a reason for each line item with manual discount applied.",
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
          !item.manualDiscountPercent &&
          !item.manualDiscountAmount &&
          item.selectedDiscountId &&
          item.selectedDiscountId !== "none"
            ? item.selectedDiscountId
            : undefined,
        promoCode: item.promoCode?.trim() || undefined,
        manualDiscountPercent:
          (item.manualDiscountPercent ?? 0) > 0
            ? item.manualDiscountPercent
            : undefined,
        manualDiscountAmount:
          (item.manualDiscountAmount ?? 0) > 0
            ? item.manualDiscountAmount
            : undefined,
        discountReason: item.discountReason?.trim() || undefined,
      })),
      notes: notes.trim() || undefined,
      payments: payments.map((p) => ({
        method: p.method,
        amount: Math.round(p.amount * 100) / 100,
      })),
      isCreditSale: isCreditSale || undefined,
    });

    // Reset form
    validationForm.reset({ locationId: "", items: [] });
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
    setSelectedPaymentMethod(enabledPaymentMethods[0]?.code ?? "CASH");
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
      validationForm.reset({ locationId: "", items: [] });
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
      setSelectedPaymentMethod(enabledPaymentMethods[0]?.code ?? "CASH");
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
        <div className="px-6 pt-6 pb-4 shrink-0 border-b border-border bg-card/50">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            New Sale
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select showroom, add lines, then complete payment.
          </p>
        </div>
      ) : (
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-border bg-card/50">
          <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">
            New Sale
          </DialogTitle>
          <p className="text-sm text-muted-foreground font-normal pt-1">
            Select showroom, add lines, then complete payment.
          </p>
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
        <>
          <AlertDialog
            open={showClearCartConfirm}
            onOpenChange={setShowClearCartConfirm}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Clear cart to change showroom?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  You have items in your cart. Clearing the cart will let you
                  select a different showroom. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    setItems([]);
                    setShowClearCartConfirm(false);
                  }}
                >
                  Clear cart
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_520px] gap-6">
                {/* Left Panel: Location, Customer, Products */}
                <div className="space-y-6">
                  {/* Location & Customer Panel */}
                  <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
                    <CardContent className="pt-6">
                      <SaleSection title="Location & Customer">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">
                              Showroom *
                            </Label>
                            <Controller
                              name="locationId"
                              control={validationForm.control}
                              render={({ field }) => (
                                <div
                                  className={
                                    items.length > 0
                                      ? "cursor-pointer [&_button]:pointer-events-none"
                                      : ""
                                  }
                                  onClick={
                                    items.length > 0
                                      ? () => setShowClearCartConfirm(true)
                                      : undefined
                                  }
                                >
                                  <Select
                                    value={field.value}
                                    onValueChange={(v) => {
                                      field.onChange(v);
                                      setLocationId(v);
                                    }}
                                    onOpenChange={(open) => {
                                      if (!open) field.onBlur();
                                    }}
                                    disabled={items.length > 0}
                                  >
                                    <SelectTrigger className="bg-background border-border">
                                      {items.length > 0 ? (
                                        <span className="flex items-center gap-2">
                                          <Lock
                                            className="h-4 w-4 shrink-0 text-muted-foreground"
                                            aria-hidden="true"
                                          />
                                          <SelectValue placeholder="Select showroom" />
                                        </span>
                                      ) : (
                                        <SelectValue placeholder="Select showroom" />
                                      )}
                                    </SelectTrigger>
                                    <SelectContent>
                                      {showrooms.map((loc) => (
                                        <SelectItem key={loc.id} value={loc.id}>
                                          {loc.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {items.length > 0 && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Clear cart to change showroom
                                    </p>
                                  )}
                                </div>
                              )}
                            />
                            {validationForm.formState.errors.locationId && (
                              <p className="text-sm text-destructive">
                                {
                                  validationForm.formState.errors.locationId
                                    .message
                                }
                              </p>
                            )}
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
                                  {contactOptions.find(
                                    (c) => c.id === contactId,
                                  )
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
                                  <X className="h-4 w-4" aria-hidden="true" />
                                </button>
                              </div>
                            ) : (
                              <div className="relative">
                                <Search
                                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                                  aria-hidden="true"
                                />
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
                                  className="pl-9 bg-background border-border"
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
                            className="[&_input]:bg-background [&_input]:border-border"
                          />
                          {memberPhone && (
                            <div className="flex items-center gap-2 flex-wrap mt-2">
                              {checkingMember ? (
                                <span className="text-xs text-muted-foreground">
                                  Checking...
                                </span>
                              ) : memberCheck?.isMember ? (
                                <Badge
                                  variant="secondary"
                                  className="text-xs font-medium uppercase px-2 py-0.5 bg-primary/15 text-primary border border-primary/25"
                                >
                                  Member
                                </Badge>
                              ) : (
                                <Input
                                  type="text"
                                  value={memberName}
                                  onChange={(e) =>
                                    setMemberName(e.target.value)
                                  }
                                  placeholder="Customer name (optional)"
                                  className="h-8 text-sm bg-background border-border"
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
                            className="border-border opacity-100 data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:opacity-100 disabled:opacity-50"
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
                      </SaleSection>
                    </CardContent>
                  </Card>

                  {/* Products Search */}
                  <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
                    <CardContent className="pt-6">
                      <SaleSection title="Add Product">
                        {!locationId ? (
                          <p className="text-sm text-muted-foreground py-4">
                            Select a showroom above to add products.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            <div className="relative">
                              <Search
                                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                                aria-hidden="true"
                              />
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
                                placeholder="Search by product name, product code (barcode), category..."
                                className="pl-9"
                              />
                            </div>
                            {scanLoading && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                <Loader2
                                  className="h-4 w-4 animate-spin"
                                  aria-hidden="true"
                                />
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
                                    <X
                                      className="h-3 w-3 mr-1"
                                      aria-hidden="true"
                                    />
                                    Clear
                                  </Button>
                                </div>
                                <div className="text-xs text-muted-foreground font-mono tabular-nums">
                                  {scannedProduct.imsCode}
                                </div>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                  {(() => {
                                    const addableRows =
                                      getAddableRowsFromProduct(
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
                                            <Plus
                                              className="h-3 w-3 mr-1"
                                              aria-hidden="true"
                                            />
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
                                <Loader2
                                  className="h-5 w-5 animate-spin text-muted-foreground"
                                  aria-label="Loading"
                                />
                              </div>
                            ) : !productSearch.trim() ? (
                              <div className="p-8 text-center text-sm text-muted-foreground border rounded-lg border-dashed">
                                Search for products by name, product code
                                (barcode), or category...
                              </div>
                            ) : filteredInventory.length === 0 ? (
                              <div className="p-4 text-center text-sm text-muted-foreground border rounded-lg">
                                No products found. Try a different search term.
                              </div>
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
                                        <div className="text-xs text-muted-foreground font-mono tabular-nums mt-0.5">
                                          {inv.variation.product.imsCode}
                                          {inv.variation.product.category
                                            ?.name && (
                                            <span className="ml-2">
                                              •{" "}
                                              {
                                                inv.variation.product.category
                                                  .name
                                              }
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
                                          <Plus
                                            className="h-4 w-4 mr-1"
                                            aria-hidden="true"
                                          />
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
                      </SaleSection>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Panel: Cart, Summary, Promo, Payment — always visible to prevent layout shift */}
                <div className="space-y-6 lg:sticky lg:top-4 lg:self-start">
                  {/* Cart Panel */}
                  <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm flex flex-col">
                    <CardContent className="pt-6 flex flex-col flex-1">
                      <SaleSection title="Shopping Cart">
                        {validationForm.formState.errors.items && (
                          <p className="text-sm text-destructive mb-2">
                            {validationForm.formState.errors.items.message}
                          </p>
                        )}
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
                                      <div className="text-sm font-semibold text-green-600 dark:text-green-500 tabular-nums whitespace-nowrap">
                                        -
                                        {formatCurrency(
                                          aggregateDiscountAmount,
                                        )}
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
                                      <div className="text-xs text-muted-foreground font-mono tabular-nums mt-1">
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
                                      aria-label={`Remove ${item.productName}`}
                                    >
                                      <Trash2
                                        className="h-3.5 w-3.5"
                                        aria-hidden="true"
                                      />
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
                                      aria-label={`Decrease quantity of ${item.productName}`}
                                    >
                                      <Minus
                                        className="h-3 w-3"
                                        aria-hidden="true"
                                      />
                                    </Button>
                                    <span
                                      className="w-10 text-center tabular-nums font-semibold text-foreground"
                                      aria-live="polite"
                                      aria-label={`Quantity: ${item.quantity}`}
                                    >
                                      {item.quantity}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7 border-border/50"
                                      onClick={() =>
                                        handleQuantityChange(index, 1)
                                      }
                                      disabled={
                                        item.quantity >= item.maxQuantity
                                      }
                                      aria-label={`Increase quantity of ${item.productName}`}
                                    >
                                      <Plus
                                        className="h-3 w-3"
                                        aria-hidden="true"
                                      />
                                    </Button>
                                  </div>

                                  {discountMode === "individual" &&
                                    !item.manualDiscountPercent &&
                                    !item.manualDiscountAmount &&
                                    item.availableDiscounts &&
                                    item.availableDiscounts.length > 0 && (
                                      <Select
                                        value={
                                          item.selectedDiscountId ?? "none"
                                        }
                                        onValueChange={(value) => {
                                          const next = [...items];
                                          const row = next[index];
                                          if (row)
                                            row.selectedDiscountId = value;
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
                                  {discountMode === "individual" &&
                                    (item.manualDiscountPercent ?? 0) <= 0 &&
                                    (item.manualDiscountAmount ?? 0) <= 0 &&
                                    getItemDiscountDisplay(item) > 0 && (
                                      <p className="text-xs text-green-600 dark:text-green-500 tabular-nums font-medium mt-1">
                                        Discount amount: −
                                        {formatCurrency(
                                          getItemDiscountDisplay(item),
                                        )}
                                      </p>
                                    )}

                                  {/* Enterprise: manual discount per line */}
                                  {discountMode === "individual" && (
                                    <div className="space-y-1.5 text-xs">
                                      <span className="text-muted-foreground">
                                        Manual discount:
                                      </span>
                                      <div className="flex flex-wrap gap-2">
                                        <Input
                                          type="number"
                                          min={0}
                                          max={100}
                                          step={0.5}
                                          placeholder="%"
                                          className="h-7 w-16 text-xs"
                                          value={
                                            item.manualDiscountPercent ?? ""
                                          }
                                          onChange={(e) => {
                                            const v = e.target.value;
                                            const num =
                                              v === ""
                                                ? undefined
                                                : Math.min(
                                                    100,
                                                    Math.max(0, Number(v) || 0),
                                                  );
                                            const next = [...items];
                                            const row = next[index];
                                            if (row) {
                                              row.manualDiscountPercent = num;
                                              if (num != null)
                                                row.manualDiscountAmount =
                                                  undefined;
                                              if (!num)
                                                row.discountReason = undefined;
                                            }
                                            setItems(next);
                                          }}
                                        />
                                        <span className="text-muted-foreground self-center">
                                          or
                                        </span>
                                        <Input
                                          type="number"
                                          min={0}
                                          step={0.01}
                                          placeholder="Amount"
                                          className="h-7 w-20 text-xs"
                                          value={
                                            item.manualDiscountAmount ?? ""
                                          }
                                          onChange={(e) => {
                                            const v = e.target.value;
                                            const num =
                                              v === ""
                                                ? undefined
                                                : Math.max(0, Number(v) || 0);
                                            const next = [...items];
                                            const row = next[index];
                                            if (row) {
                                              row.manualDiscountAmount = num;
                                              if (num != null)
                                                row.manualDiscountPercent =
                                                  undefined;
                                              if (!num)
                                                row.discountReason = undefined;
                                            }
                                            setItems(next);
                                          }}
                                        />
                                        <Input
                                          placeholder="Reason (required)"
                                          className="h-7 flex-1 min-w-[120px] text-xs"
                                          value={item.discountReason ?? ""}
                                          onChange={(e) => {
                                            const next = [...items];
                                            const row = next[index];
                                            if (row)
                                              row.discountReason =
                                                e.target.value || undefined;
                                            setItems(next);
                                          }}
                                        />
                                        {discountMode === "individual" &&
                                          ((item.manualDiscountPercent ?? 0) >
                                            0 ||
                                            (item.manualDiscountAmount ?? 0) >
                                              0) &&
                                          getItemDiscountDisplay(item) > 0 && (
                                            <p className="w-full basis-full text-xs text-green-600 dark:text-green-500 tabular-nums font-medium">
                                              Line discount: −
                                              {formatCurrency(
                                                getItemDiscountDisplay(item),
                                              )}
                                            </p>
                                          )}
                                        {((item.manualDiscountPercent ?? 0) >
                                          0 ||
                                          (item.manualDiscountAmount ?? 0) >
                                            0) && (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-muted-foreground"
                                            onClick={() => {
                                              const next = [...items];
                                              const row = next[index];
                                              if (row) {
                                                row.manualDiscountPercent =
                                                  undefined;
                                                row.manualDiscountAmount =
                                                  undefined;
                                                row.discountReason = undefined;
                                              }
                                              setItems(next);
                                            }}
                                          >
                                            Clear
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex justify-between items-center pt-2 border-t">
                                    <span className="text-xs text-muted-foreground">
                                      Line Total
                                    </span>
                                    <div className="text-right">
                                      <div className="font-bold tabular-nums text-foreground">
                                        {formatCurrency(
                                          item.unitPrice * item.quantity,
                                        )}
                                      </div>
                                      {discountMode === "individual" &&
                                        getItemDiscountDisplay(item) > 0 && (
                                          <div className="text-xs text-green-600 dark:text-green-500 tabular-nums font-medium">
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
                      </SaleSection>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-sm flex flex-col">
                    <CardContent className="pt-6 flex flex-col flex-1">
                      <SaleSection title="Order Summary">
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
                              <span className="tabular-nums font-semibold text-foreground">
                                {formatCurrency(subtotal)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Discount
                                <span className="block text-[10px] font-normal text-muted-foreground/80">
                                  Catalog / manual
                                </span>
                              </span>
                              <span className="tabular-nums font-semibold text-green-600 dark:text-green-500">
                                -{formatCurrency(productDiscountDisplay)}
                              </span>
                            </div>
                            {previewResult?.promoDiscount != null &&
                              previewResult.promoDiscount > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    Promo
                                  </span>
                                  <span className="tabular-nums font-semibold text-green-600 dark:text-green-500">
                                    -
                                    {formatCurrency(
                                      previewResult.promoDiscount,
                                    )}
                                  </span>
                                </div>
                              )}
                            {previewResult?.promoOverrodeProductDiscount && (
                              <div
                                className="flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-800 dark:text-amber-200"
                                role="status"
                              >
                                <AlertCircle
                                  className="h-3.5 w-3.5 shrink-0 mt-0.5"
                                  aria-hidden="true"
                                />
                                <span>
                                  Promo applied — product discount overwritten.
                                  You can remove the promo to restore catalog
                                  discounts.
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-center pt-2 border-t">
                              <span className="font-semibold">Total</span>
                              <span className="text-xl font-bold tabular-nums text-foreground">
                                {previewLoading ? (
                                  <Loader2
                                    className="h-5 w-5 animate-spin"
                                    aria-label="Calculating total"
                                  />
                                ) : (
                                  formatCurrency(expectedTotal)
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                      </SaleSection>

                      {items.length > 0 && (
                        <>
                          {/* Promo Code */}
                          <SaleSection title="Promo Code">
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Input
                                  value={promoCode}
                                  onChange={(e) =>
                                    setPromoCode(e.target.value.toUpperCase())
                                  }
                                  placeholder="Enter promo code..."
                                  className="uppercase pr-24"
                                  disabled={promoCodeValidating}
                                />
                                {promoCodeValidating && (
                                  <Loader2
                                    className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
                                    aria-label="Validating promo code"
                                  />
                                )}
                                {promoCode &&
                                  !promoCodeError &&
                                  !promoCodeValidating && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-green-600">
                                      Applied
                                    </span>
                                  )}
                              </div>
                              {(promoCode.trim().length > 0 ||
                                items.some((i) => i.promoCode)) && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="shrink-0"
                                  onClick={handleRemovePromo}
                                >
                                  Remove promo
                                </Button>
                              )}
                            </div>
                            {promoCodeError && (
                              <p className="text-xs text-destructive mt-2">
                                {promoCodeError}
                              </p>
                            )}
                          </SaleSection>

                          {/* Payment */}
                          <SaleSection title="Payment">
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
                                  {enabledPaymentMethods.map((method) => (
                                    <SelectItem
                                      key={method.code}
                                      value={method.code}
                                    >
                                      {method.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={paymentAmount}
                                onChange={(e) =>
                                  setPaymentAmount(e.target.value)
                                }
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
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {paymentMethodLabelMap.get(p.method) ??
                                        p.method}
                                    </Badge>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold tabular-nums text-foreground">
                                        {formatCurrency(p.amount)}
                                      </span>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() =>
                                          handleRemovePayment(p.id)
                                        }
                                        aria-label={`Remove ${paymentMethodLabelMap.get(p.method) ?? p.method} payment of ${formatCurrency(p.amount)}`}
                                      >
                                        <Trash2
                                          className="h-3 w-3"
                                          aria-hidden="true"
                                        />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Total:{" "}
                              <span className="font-semibold tabular-nums text-foreground">
                                {formatCurrency(totalPayment)}
                              </span>
                              {Math.abs(expectedTotal - totalPayment) >
                                0.01 && (
                                <span className="text-warning ml-1">
                                  · Must match {formatCurrency(expectedTotal)}
                                </span>
                              )}
                            </p>
                          </SaleSection>

                          {/* Notes */}
                          <SaleSection title="Notes" className="mt-2">
                            <Textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Add notes for this sale..."
                              rows={3}
                              className="resize-none"
                            />
                          </SaleSection>

                          {/* Validation Error — only show when !isCreditSale && payments.length > 0 */}
                          {!isCreditSale &&
                            payments.length > 0 &&
                            Math.abs(expectedTotal - totalPayment) > 0.01 && (
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
                                  Math.abs(totalPayment - expectedTotal) >
                                    0.01))
                            }
                            className="w-full mt-6 font-semibold h-11"
                            onClick={() => {
                              completeSaleClickedRef.current = true;
                              formRef.current?.requestSubmit();
                            }}
                          >
                            {isLoading ? (
                              <>
                                <Loader2
                                  className="mr-2 h-4 w-4 animate-spin"
                                  aria-hidden="true"
                                />
                                Creating...
                              </>
                            ) : (
                              <>
                                <ShoppingCart
                                  className="mr-2 h-4 w-4"
                                  aria-hidden="true"
                                />
                                Complete Sale
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </>
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
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New Sale
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[1000px] max-h-[90vh] flex flex-col p-0 overflow-hidden"
        allowDismiss={false}
      >
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
