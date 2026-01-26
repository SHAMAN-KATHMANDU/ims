"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { useDebounce } from "@/hooks/useDebounce";
import { useCheckMember } from "@/hooks/useMember";
import { useToast } from "@/hooks/useToast";
import {
  getLocationInventory,
  type LocationInventoryItem,
} from "@/services/inventoryService";
import { type Location } from "@/services/locationService";
import { type CreateSaleData, formatCurrency } from "@/services/salesService";
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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface SaleItem {
  variationId: string;
  productName: string;
  color: string;
  imsCode: string;
  unitPrice: number;
  quantity: number;
  maxQuantity: number;
  promoCode?: string;
  // Optional client-side hint for discount; actual calculation happens on the backend
  discountPercent?: number;
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
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<SaleItem[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("CASH");
  const [paymentAmount, setPaymentAmount] = useState("");

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
  const handleAddItem = (inventoryItem: LocationInventoryItem) => {
    // Check if already added
    const existingIndex = items.findIndex(
      (item) => item.variationId === inventoryItem.variationId,
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

    // Add new item
    setItems([
      ...items,
      {
        variationId: inventoryItem.variationId,
        productName: inventoryItem.variation.product.name,
        color: inventoryItem.variation.color,
        imsCode: inventoryItem.variation.product.imsCode,
        unitPrice: Number(inventoryItem.variation.product.mrp),
        quantity: 1,
        maxQuantity: inventoryItem.quantity,
        discountPercent: 0, // Will be updated if member discount applies
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

  // Calculate totals
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );

  const totalPayment = payments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );

  // Payment handlers
  const handleAddPayment = () => {
    const amount = Number(paymentAmount);
    if (amount > 0) {
      setPayments([
        ...payments,
        {
          id: `${selectedPaymentMethod}-${Date.now()}`,
          method: selectedPaymentMethod,
          amount,
        },
      ]);
      setPaymentAmount("");
    }
  };

  const handleRemovePayment = (id: string) => {
    setPayments(payments.filter((p) => p.id !== id));
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    if (totalPayment <= 0 || Math.abs(totalPayment - subtotal) > 0.01) {
      toast({
        title: "Payment Error",
        description: "Payment total must match the order total",
        variant: "destructive",
      });
      return;
    }

    await onSubmit({
      locationId,
      memberPhone: memberPhone.trim() || undefined,
      items: items.map((item) => ({
        variationId: item.variationId,
        quantity: item.quantity,
        promoCode: item.promoCode?.trim() || undefined,
      })),
      notes: notes.trim() || undefined,
      payments: payments.map((p) => ({
        method: p.method,
        amount: p.amount,
      })),
    });

    // Reset form
    setLocationId("");
    setMemberPhone("");
    setPhoneError(null);
    setNotes("");
    setItems([]);
    setProductSearch("");
    setPayments([]);
    setSelectedPaymentMethod("CASH");
    setPaymentAmount("");
  };

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setLocationId("");
      setMemberPhone("");
      setPhoneError(null);
      setNotes("");
      setItems([]);
      setProductSearch("");
      setPayments([]);
      setSelectedPaymentMethod("CASH");
      setPaymentAmount("");
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <DialogHeader>
            <DialogTitle>Create New Sale</DialogTitle>
            <DialogDescription>
              Record a sale from a showroom. Inventory will be deducted
              automatically.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(v) =>
              setActiveTab(v as "products" | "payment" | "details")
            }
            className="mt-2 flex-1 flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-3">
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

            <ScrollArea className="flex-1 pr-4 mt-4">
              <TabsContent value="products" className="space-y-6 py-2">
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
                  <Label htmlFor="memberPhone">Customer Phone (Optional)</Label>
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
                      placeholder="Enter phone for member discount"
                      className={
                        phoneError ? "pl-9 border-destructive" : "pl-9"
                      }
                    />
                  </div>
                  {phoneError && (
                    <p className="text-sm text-destructive">{phoneError}</p>
                  )}
                  {memberPhone && !phoneError && (
                    <div className="flex items-center gap-2 text-sm">
                      {checkingMember ? (
                        <span className="text-muted-foreground">
                          Checking membership...
                        </span>
                      ) : memberCheck?.isMember ? (
                        <>
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800"
                          >
                            Member
                          </Badge>
                          <span className="text-muted-foreground">
                            {memberCheck.member?.name ||
                              memberCheck.member?.phone}
                            {" - Member discount will apply"}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          Not a member - will be auto-registered
                        </span>
                      )}
                    </div>
                  )}
                </div>

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

                {/* Selected Items */}
                {items.length > 0 && (
                  <div className="space-y-2">
                    <Label>
                      <ShoppingCart className="inline-block h-4 w-4 mr-1" />
                      Cart ({items.length} items)
                    </Label>
                    <ScrollArea className="h-[300px] rounded-md border">
                      <div className="divide-y">
                        {items.map((item, index) => (
                          <div
                            key={item.variationId}
                            className="flex items-center justify-between p-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {item.productName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {item.imsCode} - {item.color}
                              </div>
                              <div className="text-sm">
                                {formatCurrency(item.unitPrice)} x{" "}
                                {item.quantity} ={" "}
                                <span className="font-medium">
                                  {formatCurrency(
                                    item.unitPrice * item.quantity,
                                  )}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center gap-2">
                                <Label className="text-xs">Promo Code</Label>
                                <Input
                                  className="h-7 w-32 text-xs"
                                  value={item.promoCode ?? ""}
                                  onChange={(e) => {
                                    const newItems = [...items];
                                    newItems[index] = {
                                      ...item,
                                      promoCode: e.target.value,
                                    };
                                    setItems(newItems);
                                  }}
                                  placeholder="Optional"
                                />
                              </div>
                            </div>
                            <div className="ml-4 flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleQuantityChange(index, -1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center">
                                {item.quantity}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleQuantityChange(index, 1)}
                                disabled={item.quantity >= item.maxQuantity}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="payment" className="space-y-6 py-2">
                {/* Total MRP Display */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total MRP</span>
                    <span className="text-lg font-semibold">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                </div>

                {/* Add Payment */}
                <div className="space-y-3">
                  <Label>Add Payment</Label>
                  <div className="flex gap-2">
                    <Select
                      value={selectedPaymentMethod}
                      onValueChange={(value) =>
                        setSelectedPaymentMethod(value as PaymentMethod)
                      }
                    >
                      <SelectTrigger className="w-[140px]">
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
                      placeholder="Amount"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddPayment();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={handleAddPayment}
                      disabled={!paymentAmount || Number(paymentAmount) <= 0}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>

                {/* Payment List */}
                {payments.length > 0 && (
                  <div className="space-y-2">
                    <Label>Payments ({payments.length})</Label>
                    <ScrollArea className="h-[200px] rounded-md border">
                      <div className="divide-y">
                        {payments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between p-3"
                          >
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">{payment.method}</Badge>
                              <span className="font-medium">
                                {formatCurrency(payment.amount)}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleRemovePayment(payment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
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
                        Math.abs(subtotal - totalPayment) < 0.01
                          ? "font-semibold text-green-600"
                          : "font-semibold text-orange-600"
                      }
                    >
                      {formatCurrency(subtotal - totalPayment)}
                    </span>
                  </div>
                  {Math.abs(subtotal - totalPayment) > 0.01 && (
                    <p className="text-xs text-muted-foreground">
                      Payment total must match Total MRP
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-6 py-2">
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
                  <div className="text-sm font-medium mb-3">Sale Summary</div>
                  <div className="flex justify-between text-sm">
                    <span>Items</span>
                    <span>{items.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total MRP</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
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
          </Tabs>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (activeTab === "products") setActiveTab("payment");
                else if (activeTab === "payment") setActiveTab("details");
              }}
              disabled={
                activeTab === "details" ||
                (activeTab === "products" &&
                  (!locationId || items.length === 0)) ||
                (activeTab === "payment" &&
                  (payments.length === 0 ||
                    totalPayment <= 0 ||
                    Math.abs(totalPayment - subtotal) > 0.01))
              }
            >
              Next
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                !locationId ||
                items.length === 0 ||
                totalPayment <= 0 ||
                Math.abs(totalPayment - subtotal) > 0.01
              }
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
