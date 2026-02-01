"use client";

import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
  getSaleTypeLabel,
  getSaleTypeColor,
  formatCurrency,
} from "@/hooks/useSales";
import {
  MapPin,
  User,
  Receipt,
  Calendar,
  Hash,
  CreditCard,
} from "lucide-react";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Sale Details
          </DialogTitle>
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
          <div className="space-y-4">
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
            <div className="grid grid-cols-2 gap-4">
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
              <div className="rounded-md border">
                <Table>
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
                            <div className="text-sm text-muted-foreground">
                              {item.variation.product.imsCode} -{" "}
                              {item.variation.color}
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
    </Dialog>
  );
}
