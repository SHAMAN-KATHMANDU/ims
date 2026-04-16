"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import axios from "axios";
import { Lock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWebsiteOrders } from "../hooks/use-website-orders";
import type {
  WebsiteOrderListItem,
  WebsiteOrderStatus,
} from "../services/website-orders.service";
import { WebsiteOrderStatusBadge } from "./WebsiteOrderStatusBadge";
import { formatMoney } from "../validation";

function isForbiddenError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 403;
}

function FeatureDisabledCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <CardTitle>Website feature not enabled</CardTitle>
          <CardDescription>
            Website orders are part of the tenant-website product. Ask your
            platform administrator to turn it on for this workspace.
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

function formatDate(iso: string): string {
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

function OrdersTable({
  orders,
  detailHref,
}: {
  orders: WebsiteOrderListItem[];
  detailHref: (id: string) => string;
}) {
  if (orders.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No orders here.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Items</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Received</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((o) => {
          const itemCount = Array.isArray(o.items) ? o.items.length : 0;
          return (
            <TableRow key={o.id}>
              <TableCell>
                <Link
                  href={detailHref(o.id)}
                  className="font-mono text-sm hover:underline"
                >
                  {o.orderCode}
                </Link>
              </TableCell>
              <TableCell>
                <div className="font-medium">{o.customerName}</div>
                <div className="text-xs text-muted-foreground">
                  {o.customerPhone}
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {itemCount} item{itemCount === 1 ? "" : "s"}
              </TableCell>
              <TableCell className="text-sm">
                {formatMoney(o.subtotal, o.currency)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(o.createdAt)}
              </TableCell>
              <TableCell>
                <WebsiteOrderStatusBadge status={o.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" asChild>
                  <Link
                    href={detailHref(o.id)}
                    aria-label={`Open ${o.orderCode}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

type TabKey = "all" | WebsiteOrderStatus;

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "PENDING_VERIFICATION", label: "Unverified" },
  { key: "VERIFIED", label: "Verified" },
  { key: "CONVERTED_TO_SALE", label: "Converted" },
  { key: "REJECTED", label: "Rejected" },
  { key: "all", label: "All" },
];

export function WebsiteOrdersPage({
  detailHrefBase,
}: {
  /** Base path — the component appends /<id> to build detail links. */
  detailHrefBase: string;
}) {
  const detailHref = (id: string) => `${detailHrefBase}/${id}`;
  const [tab, setTab] = useState<TabKey>("PENDING_VERIFICATION");
  const [search, setSearch] = useState("");

  const query = useMemo(
    () => ({
      page: 1,
      limit: 50,
      ...(tab !== "all" ? { status: tab } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    }),
    [tab, search],
  );

  const ordersQuery = useWebsiteOrders(query);
  const disabled = ordersQuery.isError && isForbiddenError(ordersQuery.error);

  if (disabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Website orders</h1>
          <p className="text-sm text-muted-foreground">
            Guest orders placed through the tenant-site cart.
          </p>
        </div>
        <FeatureDisabledCard />
      </div>
    );
  }

  const data = ordersQuery.data;
  const orders = data?.orders ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Website orders</h1>
          <p className="text-sm text-muted-foreground">
            Guest orders placed through the tenant-site cart. Verify with the
            customer, then convert to a real sale.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
            <TabsList className="flex-wrap">
              {TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Input
            placeholder="Search by order code, name, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </CardHeader>
        <CardContent>
          {ordersQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading orders…</p>
          ) : (
            <Tabs value={tab}>
              {TABS.map((t) => (
                <TabsContent key={t.key} value={t.key}>
                  <OrdersTable orders={orders} detailHref={detailHref} />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
