"use client";

import { useState } from "react";
import {
  usePricingPlans,
  useUpdatePricingPlan,
} from "@/hooks/usePlatformBilling";
import { useToast } from "@/hooks/useToast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PricingPlansTab() {
  const { data: plans = [], isLoading } = usePricingPlans();
  const updateMutation = useUpdatePricingPlan();
  const { toast } = useToast();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");

  const handleSave = async (tier: string, billingCycle: string) => {
    const price = parseFloat(editPrice);
    if (isNaN(price) || price < 0) {
      toast({ title: "Invalid price", variant: "destructive" });
      return;
    }
    try {
      await updateMutation.mutateAsync({ tier, billingCycle, data: { price } });
      toast({ title: "Pricing plan updated" });
      setEditingKey(null);
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
        <CardTitle>Pricing Plans</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tier</TableHead>
              <TableHead>Billing Cycle</TableHead>
              <TableHead>Price (NPR)</TableHead>
              <TableHead>Original Price</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  No pricing plans configured
                </TableCell>
              </TableRow>
            ) : (
              plans.map((p) => {
                const key = `${p.tier}-${p.billingCycle}`;
                const isEditing = editingKey === key;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Badge variant="outline">{p.tier}</Badge>
                    </TableCell>
                    <TableCell>{p.billingCycle}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-28 h-8"
                        />
                      ) : (
                        `NPR ${Number(p.price).toLocaleString()}`
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.originalPrice
                        ? `NPR ${Number(p.originalPrice).toLocaleString()}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.isActive ? "default" : "secondary"}>
                        {p.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleSave(p.tier, p.billingCycle)}
                            disabled={updateMutation.isPending}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingKey(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingKey(key);
                            setEditPrice(String(p.price));
                          }}
                        >
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
