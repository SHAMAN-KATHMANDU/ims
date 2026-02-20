"use client";

import { useState } from "react";
import {
  useTenantAddOns,
  useApproveTenantAddOn,
  useCancelTenantAddOn,
} from "@/hooks/usePlatformBilling";
import type { AddOnStatus } from "@/services/usageService";
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
import { Check, X } from "lucide-react";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "secondary",
  ACTIVE: "default",
  EXPIRED: "destructive",
  CANCELLED: "outline",
};

const ADD_ON_LABELS: Record<string, string> = {
  EXTRA_USER: "Extra Users",
  EXTRA_PRODUCT: "Extra Products",
  EXTRA_LOCATION: "Extra Locations",
  EXTRA_MEMBER: "Extra Members",
  EXTRA_CATEGORY: "Extra Categories",
  EXTRA_CONTACT: "Extra Contacts",
};

export function TenantAddOnsTab() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: addOns = [], isLoading } = useTenantAddOns(
    statusFilter !== "all"
      ? { status: statusFilter as AddOnStatus }
      : undefined,
  );
  const approveMutation = useApproveTenantAddOn();
  const cancelMutation = useCancelTenantAddOn();
  const { toast } = useToast();

  const handleApprove = async (id: string) => {
    try {
      await approveMutation.mutateAsync(id);
      toast({ title: "Add-on approved" });
    } catch {
      // handled by service
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelMutation.mutateAsync(id);
      toast({ title: "Add-on cancelled" });
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
          <CardTitle>Tenant Add-Ons</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {addOns.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  No add-ons found
                </TableCell>
              </TableRow>
            ) : (
              addOns.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    {a.tenant?.name ?? a.tenantId}
                  </TableCell>
                  <TableCell>{ADD_ON_LABELS[a.type] ?? a.type}</TableCell>
                  <TableCell>{a.quantity}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[a.status] ?? "secondary"}>
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.periodStart
                      ? `${new Date(a.periodStart).toLocaleDateString()} - ${a.periodEnd ? new Date(a.periodEnd).toLocaleDateString() : "Ongoing"}`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(a.requestedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {a.status === "PENDING" && (
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => handleApprove(a.id)}
                          disabled={approveMutation.isPending}
                          title="Approve"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => handleCancel(a.id)}
                          disabled={cancelMutation.isPending}
                          title="Cancel"
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                    {a.status === "ACTIVE" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(a.id)}
                        disabled={cancelMutation.isPending}
                      >
                        Cancel
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
