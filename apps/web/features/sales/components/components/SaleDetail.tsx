"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type Sale,
  type PaymentMethod,
  getSaleTypeLabel,
  getSaleTypeColor,
  formatCurrency,
  useAddPaymentToSale,
  useDeleteSale,
  useEditSale,
  useSale,
} from "../../hooks/use-sales";
import { downloadReceiptPdf } from "../../services/sales.service";
import { useToast } from "@/hooks/useToast";
import { useAuthStore } from "@/store/auth-store";
import {
  MapPin,
  User,
  Receipt,
  Calendar,
  Hash,
  CreditCard,
  Contact,
  Printer,
  FileDown,
  Trash2,
  Pencil,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { EditSaleForm } from "./EditSaleForm";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "FONEPAY", label: "Fonepay" },
  { value: "QR", label: "QR" },
];

interface SaleDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  isLoading?: boolean;
}

export function SaleDetail({
  open,
  onOpenChange,
  sale,
  isLoading,
}: SaleDetailProps) {
  const { toast } = useToast();
  const tenant = useAuthStore((s) => s.tenant);
  const addPaymentMutation = useAddPaymentToSale();
  const deleteSaleMutation = useDeleteSale();
  const editSaleMutation = useEditSale();
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("CASH");
  const [viewingOriginalId, setViewingOriginalId] = useState<string | null>(
    null,
  );

  const { data: originalSale, isLoading: originalLoading } = useSale(
    viewingOriginalId ?? "",
  );

  const displaySale: Sale | null =
    viewingOriginalId && originalSale ? originalSale : sale;
  const isViewingOriginal = Boolean(viewingOriginalId && originalSale);

  useEffect(() => {
    setViewingOriginalId(null);
  }, [sale?.id]);

  const amountPaid =
    displaySale?.payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
  const totalNum = displaySale ? Number(displaySale.total) : 0;
  const balanceDue = Math.round((totalNum - amountPaid) * 100) / 100;
  const isCreditSale = displaySale?.isCreditSale === true;
  const storeName =
    tenant?.name ?? (displaySale ? displaySale.location.name : null) ?? "Store";

  const handlePaySubmit = async () => {
    if (!sale) return;
    const amount = Number(payAmount);
    if (isNaN(amount) || amount <= 0 || amount > balanceDue + 0.01) {
      toast({
        title: "Invalid amount",
        description: `Enter an amount between 0.01 and ${formatCurrency(balanceDue)}`,
        variant: "destructive",
      });
      return;
    }
    try {
      await addPaymentMutation.mutateAsync({
        saleId: sale.id,
        method: payMethod,
        amount,
      });
      toast({ title: "Payment recorded" });
      setPayDialogOpen(false);
      setPayAmount("");
      setPayMethod("CASH");
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        title: "Payment failed",
        description: err.message ?? "Could not add payment",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePdf = async () => {
    if (!sale) return;
    setReceiptLoading(true);
    try {
      await downloadReceiptPdf(sale.id);
      toast({ title: "Receipt downloaded" });
    } catch {
      toast({
        title: "Failed to download receipt",
        variant: "destructive",
      });
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleDeleteConfirm = async (reason?: string) => {
    if (!sale) return;
    try {
      await deleteSaleMutation.mutateAsync({
        saleId: sale.id,
        deleteReason: reason || null,
      });
      toast({ title: "Sale deleted" });
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        title: "Failed to delete sale",
        description: err.message ?? "Could not delete sale",
        variant: "destructive",
      });
    }
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex w-[95vw] max-w-3xl max-h-[90vh] flex-col gap-4 p-6 sm:max-w-[800px]">
        <DialogHeader className="flex shrink-0 flex-row flex-wrap items-start justify-between gap-2">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" aria-hidden="true" />
            Sale Details
          </DialogTitle>
          {sale && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 print:hidden"
              >
                <Printer className="h-4 w-4" aria-hidden="true" />
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePdf}
                disabled={receiptLoading}
                className="gap-1.5 print:hidden"
              >
                <FileDown className="h-4 w-4" aria-hidden="true" />
                {receiptLoading ? "..." : "PDF"}
              </Button>
              {sale.isLatest !== false && !isViewingOriginal && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditDialogOpen(true)}
                  className="gap-1.5 print:hidden"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Edit
                </Button>
              )}
              {!isViewingOriginal && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive print:hidden"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
            <Separator />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : sale ? (
          !displaySale ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-40" />
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="receipt-print-area receipt-print-wrapper space-y-4">
                {/* receipt-header: store, title, receipt #, date */}
                <div className="receipt-header break-inside-avoid">
                  <div className="text-center print:mb-3">
                    <h1 className="text-xl font-bold print:text-[18pt] sm:text-2xl">
                      {storeName}
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground print:text-[10pt]">
                      {displaySale.location.name}
                    </p>
                  </div>
                  <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground print:text-[9pt]">
                    Sales Receipt
                  </p>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Hash
                          className="h-4 w-4 text-muted-foreground print:hidden"
                          aria-hidden="true"
                        />
                        <span className="font-mono text-lg font-bold print:text-[12pt]">
                          {displaySale.saleCode}
                        </span>
                        {sale.revisionNo != null &&
                          sale.revisionNo > 1 &&
                          !isViewingOriginal && (
                            <>
                              <Badge
                                variant="outline"
                                className="print:hidden bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                              >
                                Edited
                              </Badge>
                              {sale.parentSaleId && (
                                <Button
                                  type="button"
                                  variant="link"
                                  className="h-auto p-0 text-sm print:hidden"
                                  onClick={() =>
                                    setViewingOriginalId(
                                      sale.parentSaleId ?? null,
                                    )
                                  }
                                >
                                  <ExternalLink
                                    className="mr-1 h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                  View original entry
                                </Button>
                              )}
                            </>
                          )}
                        {viewingOriginalId && originalLoading && (
                          <span
                            className="text-sm text-muted-foreground print:hidden"
                            role="status"
                            aria-live="polite"
                          >
                            Loading original…
                          </span>
                        )}
                        {isViewingOriginal && (
                          <Button
                            type="button"
                            variant="link"
                            className="h-auto p-0 text-sm print:hidden"
                            onClick={() => setViewingOriginalId(null)}
                          >
                            <ArrowLeft
                              className="mr-1 h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Back to current version
                          </Button>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground print:mt-0.5 print:text-[10pt]">
                        <Calendar
                          className="h-4 w-4 print:hidden"
                          aria-hidden="true"
                        />
                        {format(
                          new Date(displaySale.createdAt),
                          "d MMM yyyy, h:mm a",
                        )}
                      </div>
                      {sale.revisionNo != null &&
                        sale.revisionNo > 1 &&
                        sale.editReason &&
                        !isViewingOriginal && (
                          <p
                            className="mt-2 text-xs text-muted-foreground print:hidden"
                            role="status"
                          >
                            Edit reason: {sale.editReason}
                          </p>
                        )}
                    </div>
                    <Badge
                      className={`print:hidden ${getSaleTypeColor(displaySale.type)}`}
                      variant="outline"
                    >
                      {getSaleTypeLabel(displaySale.type)}
                    </Badge>
                  </div>
                </div>

                <Separator className="receipt-divider" />

                {/* receipt-customer: sold to, contact, sold by */}
                <div className="receipt-customer break-inside-avoid">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground print:text-[9pt]">
                    Customer
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <MapPin
                          className="h-4 w-4 print:hidden"
                          aria-hidden="true"
                        />
                        Location
                      </div>
                      <p className="font-medium">{displaySale.location.name}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <User
                          className="h-4 w-4 print:hidden"
                          aria-hidden="true"
                        />
                        Sold To
                      </div>
                      {displaySale.member ? (
                        <div>
                          <p className="font-medium">
                            {displaySale.member.phone}
                          </p>
                          {displaySale.member.name && (
                            <p className="text-sm text-muted-foreground">
                              {displaySale.member.name}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          Walk-in Customer
                        </p>
                      )}
                    </div>
                  </div>

                  {displaySale.contact && (
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Contact
                          className="h-4 w-4 print:hidden"
                          aria-hidden="true"
                        />
                        CRM Contact
                      </div>
                      <div>
                        <p className="font-medium">
                          {displaySale.contact.firstName}
                          {displaySale.contact.lastName
                            ? ` ${displaySale.contact.lastName}`
                            : ""}
                        </p>
                        {displaySale.contact.email && (
                          <p className="text-sm text-muted-foreground">
                            {displaySale.contact.email}
                          </p>
                        )}
                        {displaySale.contact.phone && (
                          <p className="text-sm text-muted-foreground">
                            {displaySale.contact.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <User
                        className="h-4 w-4 print:hidden"
                        aria-hidden="true"
                      />
                      Sold By
                    </div>
                    <p className="font-medium">
                      {displaySale.createdBy.username}
                    </p>
                  </div>
                </div>

                <Separator className="receipt-divider" />

                {/* receipt-items: items table */}
                <div className="receipt-items break-inside-avoid">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground print:text-[9pt]">
                    Items
                  </p>
                  <div className="overflow-x-auto rounded-md border">
                    <Table className="w-full min-w-[400px] table-fixed sm:min-w-0">
                      <TableHeader>
                        <TableRow className="receipt-table-header">
                          <TableHead className="w-[40%]">Product</TableHead>
                          <TableHead className="w-[12%] text-right">
                            Price
                          </TableHead>
                          <TableHead className="w-[8%] text-center">
                            Qty
                          </TableHead>
                          <TableHead className="w-[10%] text-right">
                            Disc %
                          </TableHead>
                          <TableHead className="w-[12%] text-right">
                            Disc
                          </TableHead>
                          <TableHead className="w-[18%] text-right">
                            Total
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displaySale.items?.map((item) => (
                          <TableRow
                            key={item.id}
                            className="receipt-table-row break-inside-avoid"
                          >
                            <TableCell className="align-top">
                              <div>
                                <div className="text-sm font-medium">
                                  {item.variation.product.name}
                                </div>
                                {item.variation.attributes &&
                                  item.variation.attributes.length > 0 && (
                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                      {item.variation.attributes
                                        .map((a) => a.attributeValue.value)
                                        .join(" / ")}
                                    </div>
                                  )}
                                <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                                  {item.variation.product?.imsCode ?? "—"}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell
                              className="text-right tabular-nums"
                              style={{ fontVariantNumeric: "tabular-nums" }}
                            >
                              {formatCurrency(Number(item.unitPrice))}
                            </TableCell>
                            <TableCell className="text-center tabular-nums">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {Number(item.discountPercent) > 0 ? (
                                <span className="text-green-600 print:text-green-800">
                                  {Number(item.discountPercent).toFixed(1)}%
                                </span>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {Number(item.discountAmount ?? 0) > 0 ? (
                                <span className="text-green-600 print:text-green-800">
                                  -{formatCurrency(Number(item.discountAmount))}
                                </span>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell
                              className="text-right font-medium tabular-nums"
                              style={{ fontVariantNumeric: "tabular-nums" }}
                            >
                              {formatCurrency(Number(item.lineTotal))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <Separator className="receipt-divider" />

                {/* receipt-totals: subtotal, promo, discount, total, payment */}
                <div className="receipt-totals break-inside-avoid">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground print:text-[9pt]">
                    Totals
                  </p>
                  <div className="space-y-1.5 rounded-lg border bg-muted/50 p-4 print:border-gray-300 print:bg-gray-50">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span className="shrink-0 tabular-nums">
                        {formatCurrency(Number(displaySale.subtotal))}
                      </span>
                    </div>
                    {displaySale.promoCodesUsed &&
                      displaySale.promoCodesUsed.length > 0 && (
                        <div className="flex justify-between text-sm text-green-600 print:text-green-800">
                          <span>
                            Promo ({displaySale.promoCodesUsed.join(", ")})
                          </span>
                          <span className="shrink-0 tabular-nums">
                            -
                            {formatCurrency(
                              Number(displaySale.promoDiscount ?? 0),
                            )}
                          </span>
                        </div>
                      )}
                    {(() => {
                      const productDiscount =
                        Number(displaySale.discount) -
                        Number(displaySale.promoDiscount ?? 0);
                      return productDiscount > 0 ? (
                        <div className="flex justify-between text-sm text-green-600 print:text-green-800">
                          <span>Discount</span>
                          <span className="shrink-0 tabular-nums">
                            -{formatCurrency(productDiscount)}
                          </span>
                        </div>
                      ) : null;
                    })()}
                    <Separator className="receipt-totals-divider my-2" />
                    <div className="flex justify-between font-bold print:text-[14pt]">
                      <span>Total</span>
                      <span className="shrink-0 tabular-nums">
                        {formatCurrency(Number(sale.total))}
                      </span>
                    </div>
                    {sale.payments && sale.payments.length > 0 && (
                      <>
                        <Separator className="my-2" />
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground print:text-[9pt]">
                            Payment
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(displaySale.payments ?? []).map(
                              (payment, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium print:border-gray-400"
                                >
                                  {payment.method}:{" "}
                                  {formatCurrency(Number(payment.amount))}
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    {isCreditSale && (
                      <>
                        <Separator className="my-2" />
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Amount paid</span>
                            <span className="shrink-0 tabular-nums">
                              {formatCurrency(amountPaid)}
                            </span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>Balance due</span>
                            <span className="shrink-0 tabular-nums">
                              {formatCurrency(balanceDue)}
                            </span>
                          </div>
                          {balanceDue > 0 && !isViewingOriginal && (
                            <Button
                              size="sm"
                              className="mt-2 print:hidden"
                              onClick={() => setPayDialogOpen(true)}
                            >
                              Pay
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* receipt-payment: payment methods table (screen only for detail) */}
                {displaySale.payments && displaySale.payments.length > 0 && (
                  <div className="receipt-payment break-inside-avoid print:hidden">
                    <Separator />
                    <div>
                      <h4 className="mb-2 flex items-center gap-2 font-medium">
                        <CreditCard className="h-4 w-4" aria-hidden="true" />
                        Payment Methods
                      </h4>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Method</TableHead>
                              <TableHead className="text-right">
                                Amount
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {displaySale.payments.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell>
                                  <Badge variant="outline">
                                    {payment.method}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(Number(payment.amount))}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}

                {displaySale.notes && (
                  <div className="break-inside-avoid">
                    <h4 className="mb-1 font-medium">Notes</h4>
                    <p className="text-sm text-muted-foreground">
                      {displaySale.notes}
                    </p>
                  </div>
                )}

                {/* receipt-footer */}
                <div className="receipt-footer break-inside-avoid border-t pt-4">
                  <p className="text-center text-sm font-medium">
                    Thank you for your business
                  </p>
                  <p className="mt-1 text-center text-xs text-muted-foreground print:text-[8pt]">
                    Powered by Shamanyantra
                  </p>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Sale not found
          </div>
        )}
      </DialogContent>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
          allowDismiss={false}
        >
          <DialogHeader>
            <DialogTitle>Edit Sale</DialogTitle>
          </DialogHeader>
          {sale && (
            <EditSaleForm
              sale={sale}
              onSubmit={async (data) => {
                await editSaleMutation.mutateAsync({ saleId: sale.id, data });
                toast({ title: "Sale updated" });
                handleEditSuccess();
              }}
              onCancel={() => setEditDialogOpen(false)}
              isLoading={editSaleMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        itemName={sale?.saleCode ?? "sale"}
        title="Delete this sale?"
        description="This will soft-delete the sale, restore inventory and promo usage, and remove it from listings. This cannot be undone."
        showReasonField={true}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteSaleMutation.isPending}
      />

      {/* Pay dialog for credit sales */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="sm:max-w-[400px]" allowDismiss={false}>
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
          </DialogHeader>
          {sale && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Balance due:{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(balanceDue)}
                </span>
              </p>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={balanceDue}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={formatCurrency(balanceDue)}
                />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select
                  value={payMethod}
                  onValueChange={(v) => setPayMethod(v as PaymentMethod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePaySubmit}
              disabled={
                !payAmount ||
                Number(payAmount) <= 0 ||
                addPaymentMutation.isPending
              }
            >
              {addPaymentMutation.isPending ? "Adding..." : "Add Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
