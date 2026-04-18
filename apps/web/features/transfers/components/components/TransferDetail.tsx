"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  CheckCircle,
  Truck,
  XCircle,
  Clock,
  User,
  PackageCheck,
  Info,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  type Transfer,
  getStatusLabel,
  canApprove,
  canStartTransit,
  canComplete,
  canCancel,
} from "../../hooks/use-transfers";
import { format } from "date-fns";

interface TransferDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfer: Transfer | null;
  isLoading?: boolean;
  canManage: boolean;
  onApprove: () => void;
  onApproveAndFulfill?: () => void;
  onStartTransit: () => void;
  onComplete: () => void;
  onCancel: () => void;
  actionLoading?: boolean;
  fulfilling?: boolean;
}

function getStatusBadgeVariant(
  status: Transfer["status"],
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "PENDING":
      return "secondary";
    case "APPROVED":
      return "default";
    case "IN_TRANSIT":
      return "outline";
    case "COMPLETED":
      return "default";
    case "CANCELLED":
      return "destructive";
    default:
      return "secondary";
  }
}

export function TransferDetail({
  open,
  onOpenChange,
  transfer,
  isLoading,
  canManage,
  onApprove,
  onApproveAndFulfill,
  onStartTransit,
  onComplete,
  onCancel,
  actionLoading,
  fulfilling,
}: TransferDetailProps) {
  if (!transfer && !isLoading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Transfer Details
            {transfer && (
              <Badge variant={getStatusBadgeVariant(transfer.status)}>
                {getStatusLabel(transfer.status)}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {transfer?.transferCode || "Loading..."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          {isLoading ? (
            <div className="space-y-4 p-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : transfer ? (
            <div className="space-y-6 p-1">
              {(transfer.status === "PENDING" ||
                transfer.status === "APPROVED") && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Approving only authorizes the transfer. Stock is{" "}
                    <strong>deducted from the source</strong> when you start
                    transit, and <strong>added at the destination</strong> when
                    you mark received. Use{" "}
                    <strong>Approve &amp; move stock</strong> to do all steps in
                    one go.
                  </AlertDescription>
                </Alert>
              )}

              {/* Route Info */}
              <div className="flex items-center justify-center gap-4 rounded-lg border p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">From</p>
                  <p className="font-semibold">{transfer.fromLocation.name}</p>
                  <Badge variant="outline" className="mt-1">
                    {transfer.fromLocation.type}
                  </Badge>
                </div>
                <ArrowRight
                  className="h-6 w-6 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">To</p>
                  <p className="font-semibold">{transfer.toLocation.name}</p>
                  <Badge variant="outline" className="mt-1">
                    {transfer.toLocation.type}
                  </Badge>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="mb-2 font-semibold">
                  Items ({transfer.items?.length || 0})
                </h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Product Code</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfer.items?.map((item) => {
                        const attrLabel =
                          item.variation.attributes
                            ?.map((a) => a.attributeValue.value)
                            .join(" / ") || "";
                        const variationLabel =
                          attrLabel ||
                          item.subVariation?.name ||
                          (transfer.items && transfer.items.length > 1
                            ? `Variation #${item.variation.id.slice(0, 8)}`
                            : "");
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {item.variation.product.name}
                                  {variationLabel && (
                                    <span className="text-muted-foreground font-normal ml-1.5">
                                      — {variationLabel}
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {item.variation.product?.imsCode ?? "—"}
                                  {item.subVariation?.name
                                    ? ` / ${item.subVariation.name}`
                                    : ""}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.variation.product?.imsCode ?? "—"}
                              {item.subVariation?.name
                                ? ` / ${item.subVariation.name}`
                                : ""}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {item.quantity}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Notes */}
              {transfer.notes && (
                <div>
                  <h4 className="mb-2 font-semibold">Notes</h4>
                  <p className="text-sm text-muted-foreground rounded-md border p-3">
                    {transfer.notes}
                  </p>
                </div>
              )}

              <Separator />

              {/* Timeline / Info */}
              <div className="space-y-3">
                <h4 className="font-semibold">History</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="text-muted-foreground">Created by</span>
                    <span className="font-medium">
                      {transfer.createdBy.username}
                    </span>
                    <span className="text-muted-foreground">on</span>
                    <span>
                      {format(
                        new Date(transfer.createdAt),
                        "MMM d, yyyy HH:mm",
                      )}
                    </span>
                  </div>

                  {transfer.approvedBy && transfer.approvedAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle
                        className="h-4 w-4 text-green-500"
                        aria-hidden="true"
                      />
                      <span className="text-muted-foreground">Approved by</span>
                      <span className="font-medium">
                        {transfer.approvedBy.username}
                      </span>
                      <span className="text-muted-foreground">on</span>
                      <span>
                        {format(
                          new Date(transfer.approvedAt),
                          "MMM d, yyyy HH:mm",
                        )}
                      </span>
                    </div>
                  )}

                  {transfer.completedAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle
                        className="h-4 w-4 text-green-500"
                        aria-hidden="true"
                      />
                      <span className="text-muted-foreground">
                        Completed on
                      </span>
                      <span>
                        {format(
                          new Date(transfer.completedAt),
                          "MMM d, yyyy HH:mm",
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Audit Logs */}
                {transfer.logs && transfer.logs.length > 0 && (
                  <div className="mt-4">
                    <h5 className="text-sm font-medium mb-2">Audit Log</h5>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto">
                      {transfer.logs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start gap-2 text-xs border-l-2 border-muted pl-3 py-1"
                        >
                          <Clock
                            className="h-3 w-3 mt-0.5 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <div>
                            <span className="font-medium">{log.action}</span>
                            <span className="text-muted-foreground"> by </span>
                            <span>{log.user.username}</span>
                            <span className="text-muted-foreground"> at </span>
                            <span>
                              {format(new Date(log.createdAt), "MMM d, HH:mm")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              {canManage && (
                <>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    {canApprove(transfer) && (
                      <>
                        {onApproveAndFulfill && (
                          <Button
                            onClick={onApproveAndFulfill}
                            disabled={actionLoading || fulfilling}
                            className="gap-2"
                          >
                            <PackageCheck
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                            {fulfilling
                              ? "Moving stock…"
                              : "Approve & move stock"}
                          </Button>
                        )}
                        <Button
                          onClick={onApprove}
                          disabled={actionLoading || fulfilling}
                          variant="secondary"
                          className="gap-2"
                        >
                          <CheckCircle className="h-4 w-4" aria-hidden="true" />
                          Approve only
                        </Button>
                      </>
                    )}
                    {canStartTransit(transfer) && (
                      <Button
                        onClick={onStartTransit}
                        disabled={actionLoading || fulfilling}
                        variant="secondary"
                        className="gap-2"
                      >
                        <Truck className="h-4 w-4" aria-hidden="true" />
                        Start Transit
                      </Button>
                    )}
                    {canComplete(transfer) && (
                      <Button
                        onClick={onComplete}
                        disabled={actionLoading || fulfilling}
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Mark as Received
                      </Button>
                    )}
                    {canCancel(transfer) && (
                      <Button
                        onClick={onCancel}
                        disabled={actionLoading || fulfilling}
                        variant="destructive"
                        className="gap-2"
                      >
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        Cancel Transfer
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
