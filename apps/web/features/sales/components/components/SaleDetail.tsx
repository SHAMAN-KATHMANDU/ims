"use client";

import { useState } from "react";
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
} from "../../hooks/use-sales";
import { downloadReceiptPdf } from "../../services/sales.service";
import { useToast } from "@/hooks/useToast";
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
} from "lucide-react";

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
  const addPaymentMutation = useAddPaymentToSale();
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("CASH");

  const amountPaid =
    sale?.payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
  const totalNum = sale ? Number(sale.total) : 0;
  const balanceDue = Math.round((totalNum - amountPaid) * 100) / 100;
  const isCreditSale = sale?.isCreditSale === true;

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

  const handlePrintOrPdf = async () => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Sale Details
          </DialogTitle>
          {sale && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintOrPdf}
                disabled={receiptLoading}
                className="gap-1.5"
              >
                <Printer className="h-4 w-4" />
                {receiptLoading ? "..." : "Print"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintOrPdf}
                disabled={receiptLoading}
                className="gap-1.5"
              >
                <FileDown className="h-4 w-4" />
                {receiptLoading ? "..." : "PDF"}
              </Button>
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
          <div className="receipt-print-area space-y-4">
            {/* Header Info */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-lg font-bold">
                    {sale.saleCode}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(sale.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                </div>
              </div>
              <Badge className={getSaleTypeColor(sale.type)} variant="outline">
                {getSaleTypeLabel(sale.type)}
              </Badge>
            </div>

            <Separator />

            {/* Location & Customer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Location
                </div>
                <p className="font-medium">{sale.location.name}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="h-4 w-4" />
                  Sold To
                </div>
                {sale.member ? (
                  <div>
                    <p className="font-medium">{sale.member.phone}</p>
                    {sale.member.name && (
                      <p className="text-sm text-muted-foreground">
                        {sale.member.name}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Walk-in Customer</p>
                )}
              </div>
            </div>

            {/* CRM Contact */}
            {sale.contact && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Contact className="h-4 w-4" />
                  CRM Contact
                </div>
                <div>
                  <p className="font-medium">
                    {sale.contact.firstName}
                    {sale.contact.lastName ? ` ${sale.contact.lastName}` : ""}
                  </p>
                  {sale.contact.email && (
                    <p className="text-sm text-muted-foreground">
                      {sale.contact.email}
                    </p>
                  )}
                  {sale.contact.phone && (
                    <p className="text-sm text-muted-foreground">
                      {sale.contact.phone}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Sold By */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                Sold By
              </div>
              <p className="font-medium">{sale.createdBy.username}</p>
            </div>

            <Separator />

            {/* Items */}
            <div>
              <h4 className="font-medium mb-2">Items</h4>
              <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-[320px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Disc %</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sale.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {item.variation.product.name}
                            </div>
                            {item.variation.attributes &&
                              item.variation.attributes.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {item.variation.attributes
                                    .map((a) => a.attributeValue.value)
                                    .join(" / ")}
                                </div>
                              )}
                            <div className="text-xs text-muted-foreground font-mono mt-0.5">
                              {item.variation.product?.imsCode ?? "—"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(item.unitPrice))}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(item.discountPercent) > 0 ? (
                            <span className="text-green-600">
                              {Number(item.discountPercent).toFixed(1)}%
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(item.lineTotal))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(Number(sale.subtotal))}</span>
              </div>
              {Number(sale.discount) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(Number(sale.discount))}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(Number(sale.total))}</span>
              </div>
              {sale.payments && sale.payments.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">
                      Payment Method
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sale.payments.map((payment, idx) => (
                        <Badge key={idx} variant="outline">
                          {payment.method}: {formatCurrency(payment.amount)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {isCreditSale && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Amount paid</span>
                      <span>{formatCurrency(amountPaid)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span>Balance due</span>
                      <span>{formatCurrency(balanceDue)}</span>
                    </div>
                    {balanceDue > 0 && (
                      <Button
                        size="sm"
                        className="mt-2"
                        onClick={() => setPayDialogOpen(true)}
                      >
                        Pay
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Payment Methods */}
            {sale.payments && sale.payments.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payment Methods
                  </h4>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Method</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sale.payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              <Badge variant="outline">{payment.method}</Badge>
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
              </>
            )}

            {/* Notes */}
            {sale.notes && (
              <div>
                <h4 className="font-medium mb-1">Notes</h4>
                <p className="text-sm text-muted-foreground">{sale.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            Sale not found
          </div>
        )}
      </DialogContent>

      {/* Pay dialog for credit sales */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
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
