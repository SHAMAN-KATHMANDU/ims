"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Trash2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useActiveLocations } from "@/features/locations";
import { ConvertOrderFormSchema, formatMoney } from "../validation";
import {
  useConvertWebsiteOrder,
  useOrderStockCheck,
} from "../hooks/use-website-orders";

type PaymentRow = { method: string; amount: string };

/**
 * Convert dialog.
 *
 * Conversion requires:
 *   - a SHOWROOM location (the sales service rejects warehouses)
 *   - either a payment split totaling the subtotal, or `isCreditSale: true`
 *
 * The backend re-resolves product variations at conversion time; this
 * dialog doesn't touch items. If a product in the cart no longer has an
 * active variation, the API returns a 400 with a clear error — surfaced
 * here as a toast so the admin knows to either edit the catalog or
 * reject the order.
 */
export function ConvertOrderDialog({
  orderId,
  orderCode,
  subtotal,
  currency,
  open,
  onOpenChange,
  onConverted,
}: {
  orderId: string | null;
  orderCode: string;
  subtotal: string | number;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConverted?: () => void;
}) {
  const { toast } = useToast();
  const convertMutation = useConvertWebsiteOrder();
  const locationsQuery = useActiveLocations();

  const [locationId, setLocationId] = useState<string>("");
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [payments, setPayments] = useState<PaymentRow[]>([
    { method: "cash", amount: String(Number(subtotal)) },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [itemSources, setItemSources] = useState<Record<string, string>>({});

  const stockCheck = useOrderStockCheck(open ? orderId : null);

  // Reset state every time the dialog opens so a previous failed attempt
  // doesn't linger.
  useEffect(() => {
    if (open) {
      setLocationId("");
      setIsCreditSale(false);
      setPayments([{ method: "cash", amount: String(Number(subtotal)) }]);
      setError(null);
      setItemSources({});
    }
  }, [open, subtotal]);

  // Auto-assign best source location per item when primary location changes
  useEffect(() => {
    if (!locationId || !stockCheck.data) return;
    const sources: Record<string, string> = {};
    for (const item of stockCheck.data) {
      const atPrimary = item.stockByLocation.find(
        (s) => s.locationId === locationId,
      );
      if (atPrimary && atPrimary.available >= item.quantity) {
        sources[item.productId] = locationId;
      } else {
        const best = [...item.stockByLocation]
          .sort((a, b) => b.available - a.available)
          .find((s) => s.available >= item.quantity);
        sources[item.productId] = best?.locationId ?? locationId;
      }
    }
    setItemSources(sources);
  }, [locationId, stockCheck.data]);

  // Only showrooms are valid conversion targets — the createSale service
  // rejects warehouses at runtime, so we filter here for a clean UX.
  const showrooms = useMemo(
    () =>
      (locationsQuery.data ?? [])
        .filter((l) => l.type === "SHOWROOM" && l.isActive)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [locationsQuery.data],
  );

  const subtotalNum = Number(subtotal);
  const totalPaid = useMemo(
    () =>
      payments.reduce((sum, p) => {
        const n = Number(p.amount);
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0),
    [payments],
  );
  const remaining = subtotalNum - totalPaid;

  const handleConvert = async () => {
    if (!orderId) return;
    setError(null);

    const overrides = Object.entries(itemSources)
      .filter(([, srcId]) => srcId !== locationId)
      .map(([productId, sourceLocationId]) => ({
        productId,
        sourceLocationId,
      }));

    const parsed = ConvertOrderFormSchema.safeParse({
      locationId,
      isCreditSale,
      payments: isCreditSale
        ? undefined
        : payments.map((p) => ({
            method: p.method,
            amount: Number(p.amount),
          })),
      itemLocationOverrides: overrides.length > 0 ? overrides : undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Invalid conversion input");
      return;
    }

    // Server-side will also reject if totals don't match. Pre-flight it.
    if (!isCreditSale && Math.abs(totalPaid - subtotalNum) > 0.01) {
      setError(
        `Payments (${formatMoney(totalPaid, currency)}) must match the order total (${formatMoney(subtotalNum, currency)}).`,
      );
      return;
    }

    try {
      await convertMutation.mutateAsync({
        id: orderId,
        data: parsed.data,
      });
      toast({ title: `Order ${orderCode} converted to sale` });
      onConverted?.();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Conversion failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const addPaymentRow = () =>
    setPayments((rows) => [...rows, { method: "cash", amount: "0" }]);
  const removePaymentRow = (index: number) =>
    setPayments((rows) => rows.filter((_, i) => i !== index));
  const updatePaymentRow = (index: number, patch: Partial<PaymentRow>) =>
    setPayments((rows) =>
      rows.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Convert {orderCode} to sale</DialogTitle>
          <DialogDescription>
            Books a real Sale against one of your showrooms, decrements
            inventory, and upserts the customer as a Member.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="convert-location">Showroom</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger id="convert-location">
                <SelectValue placeholder="Pick a showroom" />
              </SelectTrigger>
              <SelectContent>
                {locationsQuery.isLoading && (
                  <SelectItem value="" disabled>
                    Loading…
                  </SelectItem>
                )}
                {!locationsQuery.isLoading && showrooms.length === 0 && (
                  <SelectItem value="" disabled>
                    No active showrooms
                  </SelectItem>
                )}
                {showrooms.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {locationId && stockCheck.data && stockCheck.data.length > 0 && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <Label className="text-sm font-medium">
                Item stock &amp; source locations
              </Label>
              <p className="text-xs text-muted-foreground">
                Pick where each item&apos;s stock comes from. Items from other
                locations will be auto-transferred to the primary showroom.
              </p>
              <div className="space-y-2 pt-1">
                {stockCheck.data.map((item) => {
                  const sourceId = itemSources[item.productId] ?? locationId;
                  const sourceStock = item.stockByLocation.find(
                    (s) => s.locationId === sourceId,
                  );
                  const hasSufficientStock =
                    (sourceStock?.available ?? 0) >= item.quantity;
                  const needsTransfer = sourceId !== locationId;
                  return (
                    <div
                      key={item.productId}
                      className="flex items-center gap-2 rounded border border-border p-2 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {item.productName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Need: {item.quantity}
                        </div>
                      </div>
                      <Select
                        value={sourceId}
                        onValueChange={(v) =>
                          setItemSources((prev) => ({
                            ...prev,
                            [item.productId]: v,
                          }))
                        }
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {item.stockByLocation.map((loc) => (
                            <SelectItem
                              key={loc.locationId}
                              value={loc.locationId}
                            >
                              {loc.locationName} ({loc.available} in stock)
                            </SelectItem>
                          ))}
                          {item.stockByLocation.length === 0 && (
                            <SelectItem value={locationId} disabled>
                              No stock anywhere
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <div className="flex shrink-0 items-center gap-1">
                        {hasSufficientStock ? (
                          <CheckCircle2
                            className="h-4 w-4 text-green-600"
                            aria-label="Sufficient stock"
                          />
                        ) : (
                          <AlertTriangle
                            className="h-4 w-4 text-destructive"
                            aria-label="Insufficient stock"
                          />
                        )}
                        {needsTransfer && hasSufficientStock && (
                          <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                            <ArrowRight
                              className="mr-0.5 inline h-3 w-3"
                              aria-hidden="true"
                            />
                            transfer
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-md border border-border p-3">
            <Switch
              id="credit-sale"
              checked={isCreditSale}
              onCheckedChange={setIsCreditSale}
            />
            <div className="space-y-1">
              <Label htmlFor="credit-sale" className="text-sm font-medium">
                Book as credit sale
              </Label>
              <p className="text-xs text-muted-foreground">
                Payment is recorded later. You still need to pick a showroom.
              </p>
            </div>
          </div>

          {!isCreditSale && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Payments</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addPaymentRow}
                >
                  <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                  Add method
                </Button>
              </div>
              {payments.map((p, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_1fr_auto] items-end gap-2"
                >
                  <Select
                    value={p.method}
                    onValueChange={(v) => updatePaymentRow(i, { method: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="bank">Bank transfer</SelectItem>
                      <SelectItem value="esewa">eSewa</SelectItem>
                      <SelectItem value="khalti">Khalti</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={p.amount}
                    onChange={(e) =>
                      updatePaymentRow(i, { amount: e.target.value })
                    }
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removePaymentRow(i)}
                    disabled={payments.length === 1}
                    aria-label="Remove payment row"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-between pt-2 text-sm">
                <span className="text-muted-foreground">Order total</span>
                <span className="font-medium">
                  {formatMoney(subtotalNum, currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-medium">
                  {formatMoney(totalPaid, currency)}
                </span>
              </div>
              <div
                className={`flex justify-between text-sm ${
                  Math.abs(remaining) < 0.01
                    ? "text-muted-foreground"
                    : "text-destructive"
                }`}
              >
                <span>Remaining</span>
                <span className="font-medium">
                  {formatMoney(remaining, currency)}
                </span>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConvert}
            disabled={convertMutation.isPending || !locationId}
          >
            {convertMutation.isPending ? "Converting…" : "Convert to sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
