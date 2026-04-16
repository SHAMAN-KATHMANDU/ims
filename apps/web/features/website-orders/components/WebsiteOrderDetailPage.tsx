"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useToast } from "@/hooks/useToast";
import {
  useWebsiteOrder,
  useVerifyWebsiteOrder,
  useDeleteWebsiteOrder,
} from "../hooks/use-website-orders";
import { WebsiteOrderStatusBadge } from "./WebsiteOrderStatusBadge";
import { RejectOrderDialog } from "./RejectOrderDialog";
import { ConvertOrderDialog } from "./ConvertOrderDialog";
import { formatMoney } from "../validation";
import type { CartItemSnapshot } from "../services/website-orders.service";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function WebsiteOrderDetailPage({
  id,
  backHref,
}: {
  id: string;
  backHref: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const orderQuery = useWebsiteOrder(id);
  const verifyMutation = useVerifyWebsiteOrder();
  const deleteMutation = useDeleteWebsiteOrder();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (orderQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (orderQuery.isError || !orderQuery.data) {
    notFound();
  }

  const order = orderQuery.data;
  const items = Array.isArray(order.items)
    ? (order.items as CartItemSnapshot[])
    : [];

  const canVerify = order.status === "PENDING_VERIFICATION";
  const canReject =
    order.status === "PENDING_VERIFICATION" || order.status === "VERIFIED";
  const canConvert = order.status === "VERIFIED";
  const canDelete = order.status !== "CONVERTED_TO_SALE";

  const handleVerify = async () => {
    try {
      await verifyMutation.mutateAsync(order.id);
      toast({ title: `Order ${order.orderCode} verified` });
    } catch (err) {
      toast({
        title: "Verify failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteMutation.mutateAsync(order.id);
      toast({ title: "Order deleted" });
      router.push(backHref);
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to orders
          </Link>
          <h1 className="mt-2 font-mono text-2xl font-semibold">
            {order.orderCode}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <WebsiteOrderStatusBadge status={order.status} />
            <span>· Received {formatDateTime(order.createdAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canVerify && (
            <Button onClick={handleVerify} disabled={verifyMutation.isPending}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {verifyMutation.isPending ? "Verifying…" : "Mark verified"}
            </Button>
          )}
          {canConvert && (
            <Button onClick={() => setConvertOpen(true)}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Convert to sale
            </Button>
          )}
          {canReject && (
            <Button variant="outline" onClick={() => setRejectOpen(true)}>
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              aria-label="Delete order"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
              <CardDescription>
                Snapshot captured at checkout. Conversion will re-resolve
                variations against the current catalog.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit</TableHead>
                      <TableHead className="text-right">Line total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((i) => (
                      <TableRow key={i.productId}>
                        <TableCell>
                          <div className="font-medium">{i.productName}</div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {i.productId}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {i.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMoney(i.unitPrice, order.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMoney(i.lineTotal, order.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="mt-4 flex justify-end border-t border-border pt-4 text-sm">
                <div className="flex items-baseline gap-4">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-lg font-semibold">
                    {formatMoney(order.subtotal, order.currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {order.customerNote && (
            <Card>
              <CardHeader>
                <CardTitle>Customer note</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">
                  {order.customerNote}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Name
                </div>
                <div className="font-medium">{order.customerName}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Phone
                </div>
                <a
                  href={`tel:${order.customerPhone}`}
                  className="text-primary hover:underline"
                >
                  {order.customerPhone}
                </a>
              </div>
              {order.customerEmail && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Email
                  </div>
                  <a
                    href={`mailto:${order.customerEmail}`}
                    className="text-primary hover:underline"
                  >
                    {order.customerEmail}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit trail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Received</span>
                <span>{formatDateTime(order.createdAt)}</span>
              </div>
              {order.verifiedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Verified</span>
                  <span>{formatDateTime(order.verifiedAt)}</span>
                </div>
              )}
              {order.rejectedAt && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rejected</span>
                    <span>{formatDateTime(order.rejectedAt)}</span>
                  </div>
                  {order.rejectionReason && (
                    <div className="rounded-md border border-border bg-muted/30 p-2">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">
                        Reason
                      </div>
                      <p className="text-sm">{order.rejectionReason}</p>
                    </div>
                  )}
                </>
              )}
              {order.convertedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Converted</span>
                  <span>{formatDateTime(order.convertedAt)}</span>
                </div>
              )}
              {order.convertedSaleId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sale ID</span>
                  <span className="font-mono text-xs">
                    {order.convertedSaleId.slice(0, 8)}…
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <RejectOrderDialog
        orderId={id}
        orderCode={order.orderCode}
        open={rejectOpen}
        onOpenChange={setRejectOpen}
      />
      <ConvertOrderDialog
        orderId={id}
        orderCode={order.orderCode}
        subtotal={order.subtotal}
        currency={order.currency}
        open={convertOpen}
        onOpenChange={setConvertOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete order {order.orderCode}?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
