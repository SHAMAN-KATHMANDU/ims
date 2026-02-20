"use client";

import { useState } from "react";
import {
  useSubscriptions,
  useUpdateSubscription,
} from "@/hooks/usePlatformBilling";
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
  TRIAL: "secondary",
  ACTIVE: "default",
  PAST_DUE: "outline",
  SUSPENDED: "destructive",
  LOCKED: "destructive",
  CANCELLED: "destructive",
};

const STATUSES = [
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "SUSPENDED",
  "LOCKED",
  "CANCELLED",
];

export function SubscriptionsTab() {
  const { data: subscriptions = [], isLoading } = useSubscriptions();
  const updateMutation = useUpdateSubscription();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateMutation.mutateAsync({ id, data: { status } });
      toast({ title: "Subscription updated" });
      setEditingId(null);
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
        <CardTitle>Subscriptions</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Cycle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  No subscriptions found
                </TableCell>
              </TableRow>
            ) : (
              subscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">
                    {sub.tenant?.name ?? sub.tenantId}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{sub.plan}</Badge>
                  </TableCell>
                  <TableCell>{sub.billingCycle}</TableCell>
                  <TableCell>
                    {editingId === sub.id ? (
                      <Select
                        defaultValue={sub.status}
                        onValueChange={(v) => handleStatusChange(sub.id, v)}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        variant={STATUS_VARIANT[sub.status] ?? "secondary"}
                      >
                        {sub.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(sub.currentPeriodStart).toLocaleDateString()} -{" "}
                    {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setEditingId(editingId === sub.id ? null : sub.id)
                      }
                    >
                      {editingId === sub.id ? "Cancel" : "Edit Status"}
                    </Button>
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
