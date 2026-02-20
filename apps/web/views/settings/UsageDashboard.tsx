"use client";

import {
  useUsage,
  useAddOns,
  useAddOnPricing,
  useTenantPlans,
  useRequestAddOn,
} from "@/hooks/useUsage";
import { useAuthStore, selectTenant } from "@/stores/auth-store";
import { useToast } from "@/hooks/useToast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Users,
  Package,
  MapPin,
  UserCheck,
  Tags,
  Contact,
  ArrowUpCircle,
  Clock,
  Shield,
} from "lucide-react";
import type { LimitedResource, AddOnType } from "@/hooks/useUsage";

const RESOURCE_META: Record<
  LimitedResource,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    addOnType: AddOnType;
  }
> = {
  users: { label: "Users", icon: Users, addOnType: "EXTRA_USER" },
  products: { label: "Products", icon: Package, addOnType: "EXTRA_PRODUCT" },
  locations: { label: "Locations", icon: MapPin, addOnType: "EXTRA_LOCATION" },
  members: { label: "Members", icon: UserCheck, addOnType: "EXTRA_MEMBER" },
  categories: {
    label: "Categories",
    icon: Tags,
    addOnType: "EXTRA_CATEGORY",
  },
  contacts: {
    label: "CRM Contacts",
    icon: Contact,
    addOnType: "EXTRA_CONTACT",
  },
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ACTIVE: "default",
  PENDING: "secondary",
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

function progressColor(percent: number): string {
  if (percent >= 100)
    return "[&_[data-slot=progress-indicator]]:bg-destructive";
  if (percent >= 80) return "[&_[data-slot=progress-indicator]]:bg-amber-500";
  return "";
}

export function UsageDashboard() {
  const tenant = useAuthStore(selectTenant);
  const { data: usageData, isLoading: usageLoading } = useUsage();
  const { data: addOns = [], isLoading: addOnsLoading } = useAddOns();
  const { data: pricing = [] } = useAddOnPricing();
  const { data: plans = [] } = useTenantPlans();
  const requestAddOn = useRequestAddOn();
  const { toast } = useToast();

  const currentPlan = plans.find((p) => p.tier === tenant?.plan);

  function formatPrice(n: number | null): string {
    if (n === null || n === undefined) return "Contact us";
    if (n === 0) return "Custom";
    return `NPR ${n.toLocaleString()}/mo`;
  }

  const handleRequestAddOn = async (type: AddOnType) => {
    try {
      await requestAddOn.mutateAsync({ type, quantity: 1 });
      toast({ title: "Add-on request submitted successfully" });
    } catch {
      // handled by service
    }
  };

  const isTrial = tenant?.subscriptionStatus === "TRIAL";

  const subscriptionInfo = tenant
    ? {
        status: tenant.subscriptionStatus,
        isTrial,
        trialEndsAt: tenant.trialEndsAt,
        planExpiresAt: tenant.planExpiresAt,
      }
    : null;

  const daysRemaining = subscriptionInfo?.planExpiresAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(subscriptionInfo.planExpiresAt).getTime() - Date.now()) /
            86400000,
        ),
      )
    : subscriptionInfo?.trialEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(subscriptionInfo.trialEndsAt).getTime() - Date.now()) /
              86400000,
          ),
        )
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Usage & Limits</h1>
        <p className="text-muted-foreground mt-1">
          Resource usage and plan details for your organization
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {currentPlan?.name ?? tenant?.plan ?? "-"}
              </span>
              <Badge
                variant={
                  subscriptionInfo?.status === "ACTIVE"
                    ? "default"
                    : "secondary"
                }
              >
                {subscriptionInfo?.status ?? "-"}
              </Badge>
            </div>
            {currentPlan && (
              <p className="text-sm font-medium mt-1">
                {formatPrice(currentPlan.priceMonthly)}
              </p>
            )}
            {currentPlan?.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {currentPlan.description}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {subscriptionInfo?.isTrial ? "Trial Period" : "Billing Period"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {daysRemaining !== null ? (
              <>
                <span className="text-2xl font-bold">{daysRemaining}</span>
                <span className="text-sm text-muted-foreground ml-1">
                  days remaining
                </span>
                {daysRemaining <= 7 && (
                  <p className="text-sm text-amber-600 mt-1">
                    {subscriptionInfo?.isTrial
                      ? "Your trial is ending soon"
                      : "Your subscription is expiring soon"}
                  </p>
                )}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">
                No expiry set
              </span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
              Upgrade Path
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentPlan && plans.length > 0 ? (
              (() => {
                const nextPlan = plans.find((p) => p.rank > currentPlan.rank);
                return nextPlan ? (
                  <div>
                    <span className="text-sm">Next tier: </span>
                    <Badge variant="outline">{nextPlan.name}</Badge>
                    <p className="text-sm font-medium mt-1">
                      {formatPrice(nextPlan.priceMonthly)}
                    </p>
                    {nextPlan.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {nextPlan.description}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    You&apos;re on the highest plan
                  </span>
                );
              })()
            ) : (
              <Skeleton className="h-6 w-32" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {usageLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-4 w-16" />
                </CardContent>
              </Card>
            ))
          : usageData?.usage.map((item) => {
              const meta = RESOURCE_META[item.resource];
              const Icon = meta.icon;
              const isUnlimited = item.effectiveLimit === -1;

              return (
                <Card key={item.resource}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {meta.label}
                      </CardTitle>
                      {item.isAtLimit && (
                        <Badge variant="destructive" className="text-xs">
                          At limit
                        </Badge>
                      )}
                      {!item.isAtLimit && item.usagePercent >= 80 && (
                        <Badge
                          variant="outline"
                          className="text-xs text-amber-600 border-amber-300"
                        >
                          Near limit
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold">{item.current}</span>
                      <span className="text-sm text-muted-foreground">
                        / {isUnlimited ? "Unlimited" : item.effectiveLimit}
                      </span>
                    </div>
                    {!isUnlimited && (
                      <Progress
                        value={item.usagePercent}
                        className={`h-2 ${progressColor(item.usagePercent)}`}
                      />
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Plan:{" "}
                        {item.baseLimit === -1 ? "Unlimited" : item.baseLimit}
                        {item.addOnQuantity > 0 &&
                          ` + ${item.addOnQuantity} add-on`}
                      </span>
                      {!isUnlimited && item.usagePercent >= 80 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => handleRequestAddOn(meta.addOnType)}
                          disabled={requestAddOn.isPending}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Request Add-On
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Plans & Pricing</CardTitle>
            <CardDescription>
              Available plans and pricing for your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => {
                const isCurrent = plan.tier === tenant?.plan;
                return (
                  <div
                    key={plan.id}
                    className={`rounded-lg border p-4 ${
                      isCurrent ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{plan.name}</span>
                      {isCurrent && (
                        <Badge variant="default" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-2xl font-bold mt-2">
                      {formatPrice(plan.priceMonthly)}
                    </p>
                    {plan.priceAnnual != null && plan.priceAnnual > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Annual: NPR {plan.priceAnnual.toLocaleString()}/yr
                      </p>
                    )}
                    {plan.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {plan.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your Add-Ons</CardTitle>
          <CardDescription>Active and pending add-on purchases</CardDescription>
        </CardHeader>
        <CardContent>
          {addOnsLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : addOns.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No add-ons yet. Request add-ons when you approach your plan
              limits.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Requested</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {addOns.map((addOn) => (
                  <TableRow key={addOn.id}>
                    <TableCell className="font-medium">
                      {ADD_ON_LABELS[addOn.type] ?? addOn.type}
                    </TableCell>
                    <TableCell>{addOn.quantity}</TableCell>
                    <TableCell>
                      <Badge
                        variant={STATUS_VARIANT[addOn.status] ?? "secondary"}
                      >
                        {addOn.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {addOn.periodStart
                        ? `${new Date(addOn.periodStart).toLocaleDateString()} - ${addOn.periodEnd ? new Date(addOn.periodEnd).toLocaleDateString() : "Ongoing"}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(addOn.requestedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pricing.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Add-Ons</CardTitle>
            <CardDescription>Pricing for additional resources</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Add-On</TableHead>
                  <TableHead>Price per unit</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Min Qty</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricing.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {ADD_ON_LABELS[p.type] ?? p.type}
                    </TableCell>
                    <TableCell>
                      NPR {Number(p.unitPrice).toLocaleString()}
                    </TableCell>
                    <TableCell>{p.billingCycle}</TableCell>
                    <TableCell>{p.minQuantity}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRequestAddOn(p.type)}
                        disabled={requestAddOn.isPending}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Request
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
