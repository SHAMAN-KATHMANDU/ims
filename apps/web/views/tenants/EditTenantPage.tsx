"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import {
  useTenant,
  useUpdateTenant,
  useChangeTenantPlan,
  useResetTenantUserPassword,
  type SubscriptionStatus,
  type PlanTier,
} from "@/hooks/useTenant";
import { TenantForm } from "./components/TenantForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KeyRound } from "lucide-react";

const PLANS: PlanTier[] = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];

export function EditTenantPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const { data: tenant, isLoading: loadingTenant } = useTenant(id);
  const updateMutation = useUpdateTenant();
  const changePlanMutation = useChangeTenantPlan();
  const resetPasswordMutation = useResetTenantUserPassword();
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const [planExpiresAt, setPlanExpiresAt] = useState("");
  const [resetPasswordUser, setResetPasswordUser] = useState<{
    id: string;
    username: string;
  } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = useCallback(
    async (data: {
      name: string;
      slug: string;
      isActive: boolean;
      subscriptionStatus: SubscriptionStatus;
    }) => {
      if (!id) return;
      try {
        await updateMutation.mutateAsync({
          id,
          data: {
            name: data.name,
            slug: data.slug,
            isActive: data.isActive,
            subscriptionStatus: data.subscriptionStatus,
          },
        });
        toast({ title: "Tenant updated successfully" });
        router.push(`${basePath}/platform/tenants`);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to update tenant";
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    },
    [id, updateMutation, toast, router, basePath],
  );

  const handleCancel = useCallback(() => {
    router.push(`${basePath}/platform/tenants`);
  }, [router, basePath]);

  const handleChangePlan = useCallback(async () => {
    if (!id || !selectedPlan) return;
    try {
      await changePlanMutation.mutateAsync({
        id,
        plan: selectedPlan,
        expiresAt: planExpiresAt.trim() || undefined,
      });
      toast({ title: "Plan updated successfully" });
      setSelectedPlan(null);
      setPlanExpiresAt("");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to change plan";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  }, [id, selectedPlan, planExpiresAt, changePlanMutation, toast]);

  const handleOpenResetPassword = useCallback(
    (user: { id: string; username: string }) => {
      setResetPasswordUser(user);
      setNewPassword("");
      setConfirmPassword("");
    },
    [],
  );

  const handleCloseResetPassword = useCallback(() => {
    setResetPasswordUser(null);
    setNewPassword("");
    setConfirmPassword("");
  }, []);

  const handleResetPassword = useCallback(async () => {
    if (!id || !resetPasswordUser) return;
    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    try {
      await resetPasswordMutation.mutateAsync({
        tenantId: id,
        userId: resetPasswordUser.id,
        newPassword,
      });
      toast({ title: "Password reset successfully" });
      handleCloseResetPassword();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to reset password";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  }, [
    id,
    resetPasswordUser,
    newPassword,
    confirmPassword,
    resetPasswordMutation,
    toast,
    handleCloseResetPassword,
  ]);

  if (loadingTenant || !tenant) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link
            href={`${basePath}/platform/tenants`}
            className="inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to tenants
          </Link>
        </Button>
        <div className="text-muted-foreground">Loading tenant…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link
          href={`${basePath}/platform/tenants`}
          className="inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to tenants
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold">Edit tenant</h1>
        <p className="text-muted-foreground mt-1">
          {tenant.name} ({tenant.slug})
        </p>
      </div>

      <TenantForm
        mode="edit"
        tenant={tenant}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={updateMutation.isPending}
      />

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Change plan</CardTitle>
          <CardDescription>
            Current plan: <Badge variant="outline">{tenant.plan}</Badge>
            {tenant.planExpiresAt && (
              <span className="ml-2 text-muted-foreground">
                (expires {new Date(tenant.planExpiresAt).toLocaleDateString()})
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>New plan</Label>
            <Select
              value={selectedPlan ?? ""}
              onValueChange={(v) => setSelectedPlan(v as PlanTier)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {PLANS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="planExpiresAt">Plan expires at (optional)</Label>
            <Input
              id="planExpiresAt"
              type="date"
              value={planExpiresAt}
              onChange={(e) => setPlanExpiresAt(e.target.value)}
            />
          </div>
          <Button
            type="button"
            onClick={handleChangePlan}
            disabled={!selectedPlan || changePlanMutation.isPending}
          >
            {changePlanMutation.isPending ? "Updating…" : "Change plan"}
          </Button>
        </CardContent>
      </Card>

      {tenant.users && tenant.users.length > 0 && (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Reset user password</CardTitle>
            <CardDescription>
              Set a new password for any user in this tenant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tenant.users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div>
                    <span className="font-medium">{user.username}</span>
                    <Badge variant="secondary" className="ml-2">
                      {user.role}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleOpenResetPassword({
                        id: user.id,
                        username: user.username,
                      })
                    }
                  >
                    <KeyRound className="mr-1 h-4 w-4" />
                    Reset password
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={!!resetPasswordUser}
        onOpenChange={(open) => !open && handleCloseResetPassword()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetPasswordUser?.username}. They will
              need to use this password to log in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseResetPassword}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleResetPassword}
              disabled={
                resetPasswordMutation.isPending ||
                newPassword.length < 6 ||
                newPassword !== confirmPassword
              }
            >
              {resetPasswordMutation.isPending
                ? "Resetting…"
                : "Reset password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
