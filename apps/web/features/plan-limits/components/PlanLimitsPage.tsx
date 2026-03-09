"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/useToast";
import {
  usePlanLimits,
  useUpsertPlanLimit,
  type PlanTier,
  type PlanLimit,
} from "../hooks/use-plan-limits";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const TIERS: PlanTier[] = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];

function formatLimit(value: number): string {
  if (value === -1) return "";
  return String(value);
}

function parseLimit(input: string): number {
  const trimmed = input.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "unlimited") return -1;
  const num = parseInt(trimmed, 10);
  return isNaN(num) ? -1 : num;
}

export function PlanLimitsPage() {
  const { toast } = useToast();
  const { data: planLimits = [], isLoading } = usePlanLimits();
  const upsertMutation = useUpsertPlanLimit();

  const [editing, setEditing] = useState<Record<PlanTier, Partial<PlanLimit>>>({
    STARTER: {},
    PROFESSIONAL: {},
    ENTERPRISE: {},
  });

  useEffect(() => {
    const next: Record<PlanTier, Partial<PlanLimit>> = {
      STARTER: {},
      PROFESSIONAL: {},
      ENTERPRISE: {},
    };
    for (const pl of planLimits) {
      next[pl.tier] = {
        maxUsers: pl.maxUsers,
        maxProducts: pl.maxProducts,
        maxLocations: pl.maxLocations,
        maxMembers: pl.maxMembers,
        maxCustomers: pl.maxCustomers,
        bulkUpload: pl.bulkUpload,
        analytics: pl.analytics,
        promoManagement: pl.promoManagement,
        auditLogs: pl.auditLogs,
        apiAccess: pl.apiAccess,
        salesPipeline: pl.salesPipeline,
      };
    }
    setEditing(next);
  }, [planLimits]);

  const getLimit = (
    tier: PlanTier,
    key: keyof PlanLimit,
  ): number | boolean | undefined => {
    const v = editing[tier]?.[key];
    return typeof v === "number" || typeof v === "boolean" ? v : undefined;
  };

  const setLimit = (
    tier: PlanTier,
    key: keyof PlanLimit,
    value: number | boolean,
  ) => {
    setEditing((prev) => ({
      ...prev,
      [tier]: { ...prev[tier], [key]: value },
    }));
  };

  const handleSave = async (tier: PlanTier) => {
    const data = editing[tier];
    if (!data) return;
    try {
      await upsertMutation.mutateAsync({
        tier,
        data: {
          maxUsers:
            typeof data.maxUsers === "number" ? data.maxUsers : undefined,
          maxProducts:
            typeof data.maxProducts === "number" ? data.maxProducts : undefined,
          maxLocations:
            typeof data.maxLocations === "number"
              ? data.maxLocations
              : undefined,
          maxMembers:
            typeof data.maxMembers === "number" ? data.maxMembers : undefined,
          maxCustomers:
            typeof data.maxCustomers === "number"
              ? data.maxCustomers
              : undefined,
          bulkUpload: data.bulkUpload,
          analytics: data.analytics,
          promoManagement: data.promoManagement,
          auditLogs: data.auditLogs,
          apiAccess: data.apiAccess,
          salesPipeline: data.salesPipeline,
        },
      });
      toast({ title: `${tier} plan limits saved` });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Plan limits</h1>
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Plan limits</h1>
        <p className="text-muted-foreground mt-1">
          Set default limits per plan tier. Use -1 or leave empty for unlimited.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {TIERS.map((tier) => (
          <Card key={tier}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Badge variant="outline">{tier}</Badge>
              </CardTitle>
              <CardDescription>Default limits for {tier} plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                [
                  "maxUsers",
                  "maxProducts",
                  "maxLocations",
                  "maxMembers",
                  "maxCustomers",
                ] as const
              ).map((key) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`${tier}-${key}`}>
                    {key
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (s) => s.toUpperCase())}
                  </Label>
                  <Input
                    id={`${tier}-${key}`}
                    type="number"
                    min={-1}
                    placeholder="Unlimited (-1)"
                    value={formatLimit((getLimit(tier, key) as number) ?? -1)}
                    onChange={(e) =>
                      setLimit(tier, key, parseLimit(e.target.value))
                    }
                  />
                </div>
              ))}
              {(
                [
                  "bulkUpload",
                  "analytics",
                  "promoManagement",
                  "auditLogs",
                  "apiAccess",
                  "salesPipeline",
                ] as const
              ).map((key) => (
                <div key={key} className="flex items-center justify-between">
                  <Label>
                    {key
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (s) => s.toUpperCase())}
                  </Label>
                  <Switch
                    checked={!!getLimit(tier, key)}
                    onCheckedChange={(v) => setLimit(tier, key, v)}
                  />
                </div>
              ))}
              <Button
                type="button"
                onClick={() => handleSave(tier)}
                disabled={upsertMutation.isPending}
              >
                {upsertMutation.isPending ? "Saving…" : `Save ${tier}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
