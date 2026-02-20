"use client";

import { useState } from "react";
import { usePayments, useUpdatePayment } from "@/hooks/usePlatformBilling";
import { useToast } from "@/hooks/useToast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "secondary",
  COMPLETED: "default",
  FAILED: "destructive",
  REFUNDED: "outline",
};

const GATEWAYS = [
  "ESEWA",
  "KHALTI",
  "FONEPAY",
  "CONNECTIPS",
  "BANK_TRANSFER",
  "MANUAL",
];

export function PaymentsTab() {
  const [gatewayFilter, setGatewayFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: payments = [], isLoading } = usePayments();
  const updateMutation = useUpdatePayment();
  const { toast } = useToast();

  const filtered = payments.filter((p) => {
    if (gatewayFilter !== "all" && p.gateway !== gatewayFilter) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  });

  const handleVerify = async (id: string) => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: { status: "COMPLETED", verifiedAt: new Date().toISOString() },
      });
      toast({ title: "Payment verified" });
    } catch {
      // handled by service
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Payments</CardTitle>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={gatewayFilter} onValueChange={setGatewayFilter}>
              <SelectTrigger className="w-36 h-8">
                <SelectValue placeholder="Gateway" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Gateways</SelectItem>
                {GATEWAYS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Gateway</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  No payments found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.tenant?.name ?? p.tenantId}
                  </TableCell>
                  <TableCell>
                    {p.currency} {Number(p.amount).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.gateway}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[p.status] ?? "secondary"}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {p.paidFor} / {p.billingCycle}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(p.periodStart).toLocaleDateString()} -{" "}
                    {new Date(p.periodEnd).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {p.status === "PENDING" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerify(p.id)}
                        disabled={updateMutation.isPending}
                      >
                        Verify
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
