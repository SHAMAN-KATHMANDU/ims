"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTenantDetail, usePlans } from "@/hooks/usePlatformBilling";
import {
  useUpdateTenant,
  useChangeTenantPlan,
  useResetTenantUserPassword,
  useDeactivateTenant,
  useActivateTenant,
} from "@/hooks/useTenant";
import type { PlanTier } from "@/hooks/useTenant";
import { useToast } from "@/hooks/useToast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  ArrowLeft,
  Users,
  Package,
  MapPin,
  UserCheck,
  Tags,
  Contact,
  ShoppingCart,
  ArrowLeftRight,
  Shield,
  Key,
  Settings,
} from "lucide-react";

interface TenantSubscription {
  id: string;
  plan: string;
  billingCycle: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  gracePeriodEnd?: string | null;
  createdAt?: string;
}

interface TenantPaymentRecord {
  id: string;
  amount: string | number;
  gateway: string;
  status: string;
  paidFor?: string;
  billingCycle?: string;
  periodStart: string | null;
  periodEnd: string | null;
  verifiedAt: string | null;
  notes: string | null;
  createdAt?: string;
  subscription?: { plan: string; billingCycle: string };
}

interface TenantAddOnRecord {
  id: string;
  type: string;
  quantity: number;
  status: string;
  periodStart: string | null;
  periodEnd: string | null;
  requestedAt: string | null;
  approvedAt: string | null;
}

interface TenantDetailData {
  id: string;
  name: string;
  slug: string;
  plan: string;
  subscriptionStatus: string;
  isActive: boolean;
  isTrial: boolean;
  trialEndsAt: string | null;
  planExpiresAt: string | null;
  createdAt: string;
  updatedAt?: string;
  users: Array<{
    id: string;
    username: string;
    role: string;
    lastLoginAt: string | null;
  }>;
  _count: Record<string, number>;
  subscriptions: TenantSubscription[];
  payments: TenantPaymentRecord[];
  addOns: TenantAddOnRecord[];
}

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

const PAYMENT_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "secondary",
  COMPLETED: "default",
  FAILED: "outline",
  REFUNDED: "destructive",
};

const ADDON_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "secondary",
  ACTIVE: "default",
  EXPIRED: "destructive",
  CANCELLED: "destructive",
};

const ADDON_LABELS: Record<string, string> = {
  EXTRA_USER: "Extra Users",
  EXTRA_PRODUCT: "Extra Products",
  EXTRA_LOCATION: "Extra Locations",
  EXTRA_MEMBER: "Extra Members",
  EXTRA_CATEGORY: "Extra Categories",
  EXTRA_CONTACT: "Extra Contacts",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function formatCurrency(amount: string | number): string {
  return `NPR ${Number(amount).toLocaleString()}`;
}

interface UsageCardProps {
  label: string;
  count: number;
  icon: React.ReactNode;
}

function UsageCard({ label, count, icon }: UsageCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-muted p-2">{icon}</div>
          <div>
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewTab({ tenant }: { tenant: TenantDetailData }) {
  const changePlanMutation = useChangeTenantPlan();
  const activateMutation = useActivateTenant();
  const deactivateMutation = useDeactivateTenant();
  const { data: plans = [] } = usePlans();
  const { toast } = useToast();

  const [selectedPlan, setSelectedPlan] = useState(tenant.plan ?? "");
  const [showDeactivate, setShowDeactivate] = useState(false);

  const counts = tenant._count ?? {};
  const iconClass = "h-4 w-4 text-muted-foreground";

  const handleChangePlan = async () => {
    if (!selectedPlan || selectedPlan === tenant.plan) return;
    try {
      await changePlanMutation.mutateAsync({
        id: tenant.id,
        plan: selectedPlan as PlanTier,
      });
      toast({ title: "Plan updated successfully" });
    } catch {
      toast({ title: "Failed to change plan", variant: "destructive" });
    }
  };

  const handleToggleActive = async () => {
    if (tenant.isActive) {
      setShowDeactivate(true);
    } else {
      try {
        await activateMutation.mutateAsync(tenant.id);
        toast({ title: "Tenant activated" });
      } catch {
        toast({ title: "Failed to activate tenant", variant: "destructive" });
      }
    }
  };

  const handleConfirmDeactivate = async () => {
    try {
      await deactivateMutation.mutateAsync(tenant.id);
      toast({ title: "Tenant deactivated" });
    } catch {
      toast({ title: "Failed to deactivate tenant", variant: "destructive" });
    } finally {
      setShowDeactivate(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <UsageCard
          label="Users"
          count={counts.users ?? 0}
          icon={<Users className={iconClass} />}
        />
        <UsageCard
          label="Products"
          count={counts.products ?? 0}
          icon={<Package className={iconClass} />}
        />
        <UsageCard
          label="Locations"
          count={counts.locations ?? 0}
          icon={<MapPin className={iconClass} />}
        />
        <UsageCard
          label="Members"
          count={counts.members ?? 0}
          icon={<UserCheck className={iconClass} />}
        />
        <UsageCard
          label="Categories"
          count={counts.categories ?? 0}
          icon={<Tags className={iconClass} />}
        />
        <UsageCard
          label="Contacts"
          count={counts.contacts ?? 0}
          icon={<Contact className={iconClass} />}
        />
        <UsageCard
          label="Sales"
          count={counts.sales ?? 0}
          icon={<ShoppingCart className={iconClass} />}
        />
        <UsageCard
          label="Transfers"
          count={counts.transfers ?? 0}
          icon={<ArrowLeftRight className={iconClass} />}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tenant Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{formatDate(tenant.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trial</span>
              <span>
                {tenant.isTrial ? (
                  <Badge variant="secondary">
                    Ends {formatDate(tenant.trialEndsAt)}
                  </Badge>
                ) : (
                  "No"
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan Expiry</span>
              <span>{formatDate(tenant.planExpiresAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated</span>
              <span>{formatDate(tenant.updatedAt)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Change Plan</Label>
              <div className="flex gap-2">
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.tier}>
                        {p.name} ({p.tier})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleChangePlan}
                  disabled={
                    changePlanMutation.isPending ||
                    !selectedPlan ||
                    selectedPlan === tenant.plan
                  }
                  size="sm"
                >
                  {changePlanMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-sm font-medium">
                  {tenant.isActive ? "Deactivate Tenant" : "Activate Tenant"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tenant.isActive
                    ? "This will revoke access for all users"
                    : "Re-enable access for this tenant"}
                </p>
              </div>
              <Button
                variant={tenant.isActive ? "destructive" : "default"}
                size="sm"
                onClick={handleToggleActive}
                disabled={
                  activateMutation.isPending || deactivateMutation.isPending
                }
              >
                {tenant.isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showDeactivate} onOpenChange={setShowDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate{" "}
              <span className="font-medium">{tenant.name}</span>. The tenant and
              all its users will lose access. This can be reversed later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deactivateMutation.isPending ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UsersTab({ tenant }: { tenant: TenantDetailData }) {
  const resetPasswordMutation = useResetTenantUserPassword();
  const { toast } = useToast();

  const [resetTarget, setResetTarget] = useState<{
    id: string;
    username: string;
  } | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const handleResetPassword = async () => {
    if (!resetTarget || newPassword.length < 6) return;
    try {
      await resetPasswordMutation.mutateAsync({
        tenantId: tenant.id,
        userId: resetTarget.id,
        newPassword,
      });
      toast({ title: "Password reset successfully" });
      setResetTarget(null);
      setNewPassword("");
    } catch {
      toast({ title: "Failed to reset password", variant: "destructive" });
    }
  };

  const users = tenant.users ?? [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tenant Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground py-12"
                    >
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map(
                    (u: {
                      id: string;
                      username: string;
                      role: string;
                      lastLoginAt: string | null;
                    }) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.username}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              u.role === "ADMIN" ? "default" : "secondary"
                            }
                          >
                            <Shield className="mr-1 h-3 w-3" />
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(u.lastLoginAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() =>
                              setResetTarget({
                                id: u.id,
                                username: u.username,
                              })
                            }
                          >
                            <Key className="h-3.5 w-3.5" />
                            Reset
                          </Button>
                        </TableCell>
                      </TableRow>
                    ),
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!resetTarget}
        onOpenChange={(open) => {
          if (!open) {
            setResetTarget(null);
            setNewPassword("");
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for{" "}
              <span className="font-medium">{resetTarget?.username}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
              {newPassword.length > 0 && newPassword.length < 6 && (
                <p className="text-sm text-destructive">
                  Password must be at least 6 characters
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetTarget(null);
                setNewPassword("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={
                resetPasswordMutation.isPending || newPassword.length < 6
              }
            >
              {resetPasswordMutation.isPending
                ? "Resetting..."
                : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SubscriptionTab({ tenant }: { tenant: TenantDetailData }) {
  const changePlanMutation = useChangeTenantPlan();
  const { data: plans = [] } = usePlans();
  const { toast } = useToast();

  const [selectedPlan, setSelectedPlan] = useState(tenant.plan ?? "");

  const subscriptions = tenant.subscriptions ?? [];
  const currentSub = subscriptions.length > 0 ? subscriptions[0] : null;

  const handleChangePlan = async () => {
    if (!selectedPlan || selectedPlan === tenant.plan) return;
    try {
      await changePlanMutation.mutateAsync({
        id: tenant.id,
        plan: selectedPlan as PlanTier,
      });
      toast({ title: "Plan changed successfully" });
    } catch {
      toast({ title: "Failed to change plan", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {currentSub && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex justify-between sm:flex-col sm:gap-1">
                <span className="text-muted-foreground">Plan</span>
                <Badge variant="outline">{currentSub.plan}</Badge>
              </div>
              <div className="flex justify-between sm:flex-col sm:gap-1">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant={STATUS_VARIANT[currentSub.status] ?? "secondary"}
                >
                  {currentSub.status}
                </Badge>
              </div>
              <div className="flex justify-between sm:flex-col sm:gap-1">
                <span className="text-muted-foreground">Billing Cycle</span>
                <span>{currentSub.billingCycle}</span>
              </div>
              <div className="flex justify-between sm:flex-col sm:gap-1">
                <span className="text-muted-foreground">Period</span>
                <span>
                  {formatDate(currentSub.currentPeriodStart)} -{" "}
                  {formatDate(currentSub.currentPeriodEnd)}
                </span>
              </div>
              {currentSub.trialEndsAt && (
                <div className="flex justify-between sm:flex-col sm:gap-1">
                  <span className="text-muted-foreground">Trial Ends</span>
                  <span>{formatDate(currentSub.trialEndsAt)}</span>
                </div>
              )}
              {currentSub.gracePeriodEnd && (
                <div className="flex justify-between sm:flex-col sm:gap-1">
                  <span className="text-muted-foreground">Grace Period</span>
                  <span>{formatDate(currentSub.gracePeriodEnd)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period Start</TableHead>
                  <TableHead>Period End</TableHead>
                  <TableHead>Trial Ends</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-12"
                    >
                      No subscription history
                    </TableCell>
                  </TableRow>
                ) : (
                  subscriptions.map(
                    (s: {
                      id: string;
                      plan: string;
                      billingCycle: string;
                      status: string;
                      currentPeriodStart: string | null;
                      currentPeriodEnd: string | null;
                      trialEndsAt: string | null;
                    }) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <Badge variant="outline">{s.plan}</Badge>
                        </TableCell>
                        <TableCell>{s.billingCycle}</TableCell>
                        <TableCell>
                          <Badge
                            variant={STATUS_VARIANT[s.status] ?? "secondary"}
                          >
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(s.currentPeriodStart)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(s.currentPeriodEnd)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(s.trialEndsAt)}
                        </TableCell>
                      </TableRow>
                    ),
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 max-w-md">
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.tier}>
                    {p.name} ({p.tier})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleChangePlan}
              disabled={
                changePlanMutation.isPending ||
                !selectedPlan ||
                selectedPlan === tenant.plan
              }
            >
              {changePlanMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentsTab({ tenant }: { tenant: TenantDetailData }) {
  const payments = tenant.payments ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount</TableHead>
                <TableHead>Gateway</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-12"
                  >
                    No payments found
                  </TableCell>
                </TableRow>
              ) : (
                payments.map(
                  (p: {
                    id: string;
                    amount: string | number;
                    gateway: string;
                    status: string;
                    periodStart: string | null;
                    periodEnd: string | null;
                    verifiedAt: string | null;
                    notes: string | null;
                  }) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {formatCurrency(p.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.gateway}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            PAYMENT_STATUS_VARIANT[p.status] ?? "secondary"
                          }
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(p.periodStart)} - {formatDate(p.periodEnd)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.verifiedAt ? formatDate(p.verifiedAt) : "-"}
                      </TableCell>
                      <TableCell
                        className="text-sm text-muted-foreground max-w-[200px] truncate"
                        title={p.notes ?? undefined}
                      >
                        {p.notes ?? "-"}
                      </TableCell>
                    </TableRow>
                  ),
                )
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function AddOnsTab({ tenant }: { tenant: TenantDetailData }) {
  const addOns = tenant.addOns ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add-Ons</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Approved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {addOns.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-12"
                  >
                    No add-ons found
                  </TableCell>
                </TableRow>
              ) : (
                addOns.map(
                  (a: {
                    id: string;
                    type: string;
                    quantity: number;
                    status: string;
                    periodStart: string | null;
                    periodEnd: string | null;
                    requestedAt: string | null;
                    approvedAt: string | null;
                  }) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {ADDON_LABELS[a.type] ?? a.type}
                      </TableCell>
                      <TableCell>{a.quantity}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ADDON_STATUS_VARIANT[a.status] ?? "secondary"
                          }
                        >
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {a.periodStart
                          ? `${formatDate(a.periodStart)} - ${a.periodEnd ? formatDate(a.periodEnd) : "Ongoing"}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(a.requestedAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(a.approvedAt)}
                      </TableCell>
                    </TableRow>
                  ),
                )
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsTab({ tenant }: { tenant: TenantDetailData }) {
  const updateMutation = useUpdateTenant();
  const activateMutation = useActivateTenant();
  const deactivateMutation = useDeactivateTenant();
  const { toast } = useToast();

  const [name, setName] = useState(tenant.name ?? "");
  const [slug, setSlug] = useState(tenant.slug ?? "");
  const [isActive, setIsActive] = useState(tenant.isActive ?? true);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showActivate, setShowActivate] = useState(false);

  const hasChanges =
    name !== tenant.name ||
    slug !== tenant.slug ||
    isActive !== tenant.isActive;

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: tenant.id,
        data: { name: name.trim(), slug: slug.trim(), isActive },
      });
      toast({ title: "Tenant updated successfully" });
    } catch {
      toast({ title: "Failed to update tenant", variant: "destructive" });
    }
  };

  const handleConfirmDeactivate = async () => {
    try {
      await deactivateMutation.mutateAsync(tenant.id);
      toast({ title: "Tenant deactivated" });
      setIsActive(false);
    } catch {
      toast({ title: "Failed to deactivate tenant", variant: "destructive" });
    } finally {
      setShowDeactivate(false);
    }
  };

  const handleConfirmActivate = async () => {
    try {
      await activateMutation.mutateAsync(tenant.id);
      toast({ title: "Tenant activated" });
      setIsActive(true);
    } catch {
      toast({ title: "Failed to activate tenant", variant: "destructive" });
    } finally {
      setShowActivate(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 max-w-md">
            <Label htmlFor="settings-name">Name</Label>
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2 max-w-md">
            <Label htmlFor="settings-slug">Slug</Label>
            <Input
              id="settings-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Switch
              id="settings-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="settings-active">Active</Label>
          </div>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending || !hasChanges}
            className="mt-2"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {tenant.isActive ? "Deactivate Tenant" : "Activate Tenant"}
              </p>
              <p className="text-xs text-muted-foreground">
                {tenant.isActive
                  ? "Deactivating will revoke access for all users in this organization."
                  : "Activating will restore access for all users in this organization."}
              </p>
            </div>
            <Button
              variant={tenant.isActive ? "destructive" : "default"}
              size="sm"
              onClick={() =>
                tenant.isActive
                  ? setShowDeactivate(true)
                  : setShowActivate(true)
              }
              disabled={
                activateMutation.isPending || deactivateMutation.isPending
              }
            >
              {tenant.isActive ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeactivate} onOpenChange={setShowDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate{" "}
              <span className="font-medium">{tenant.name}</span>. All users will
              lose access immediately. This can be reversed later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deactivateMutation.isPending ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showActivate} onOpenChange={setShowActivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              This will re-activate{" "}
              <span className="font-medium">{tenant.name}</span>. All users will
              regain access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmActivate}>
              {activateMutation.isPending ? "Activating..." : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function TenantDetailPage() {
  const params = useParams();
  const tenantId = params?.id as string | undefined;
  const workspace = (params?.workspace as string) ?? "superadmin";

  const {
    data: rawTenant,
    isLoading,
    isError,
  } = useTenantDetail(tenantId ?? null);
  const tenant = rawTenant as TenantDetailData | undefined;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-full max-w-lg" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !tenant) {
    return (
      <div className="space-y-4">
        <Link
          href={`/${workspace}/platform/billing`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Billing
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {isError
                ? "Failed to load tenant details. Please try again."
                : "Tenant not found."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <Link
            href={`/${workspace}/platform/billing`}
            className="mt-1 inline-flex items-center justify-center rounded-md border h-9 w-9 hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{tenant.name}</h1>
            <p className="text-sm text-muted-foreground font-mono">
              {tenant.slug}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{tenant.plan}</Badge>
          <Badge
            variant={STATUS_VARIANT[tenant.subscriptionStatus] ?? "secondary"}
          >
            {tenant.subscriptionStatus}
          </Badge>
          <Badge variant={tenant.isActive ? "default" : "destructive"}>
            {tenant.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Users
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-1.5">
            <ShoppingCart className="h-3.5 w-3.5" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="addons" className="gap-1.5">
            <Tags className="h-3.5 w-3.5" />
            Add-Ons
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab tenant={tenant} />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersTab tenant={tenant} />
        </TabsContent>
        <TabsContent value="subscription" className="mt-4">
          <SubscriptionTab tenant={tenant} />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <PaymentsTab tenant={tenant} />
        </TabsContent>
        <TabsContent value="addons" className="mt-4">
          <AddOnsTab tenant={tenant} />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <SettingsTab tenant={tenant} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
