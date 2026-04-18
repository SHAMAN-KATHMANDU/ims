"use client";

import { useCallback, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import {
  useTenant,
  useUpdateTenant,
  useChangeTenantPlan,
  useCreateTenantUser,
  useResetTenantUserPassword,
  type SubscriptionStatus,
  type PlanTier,
} from "../hooks/use-tenants";
import { TenantForm } from "./components/TenantForm";
import { TenantNavTabs } from "@/features/sites";
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
import { KeyRound, UserPlus } from "lucide-react";

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
  const createUserMutation = useCreateTenantUser();
  const resetPasswordMutation = useResetTenantUserPassword();
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createUserUsername, setCreateUserUsername] = useState("");
  const [createUserPassword, setCreateUserPassword] = useState("");
  const [createUserConfirmPassword, setCreateUserConfirmPassword] =
    useState("");
  const [createUserRole, setCreateUserRole] = useState<
    "admin" | "user" | "superAdmin"
  >("user");
  const [planExpiresAt, setPlanExpiresAt] = useState("");
  const [resetPasswordUser, setResetPasswordUser] = useState<{
    id: string;
    username: string;
  } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [limitOverrides, setLimitOverrides] = useState<{
    customMaxUsers: string;
    customMaxProducts: string;
    customMaxLocations: string;
    customMaxMembers: string;
    customMaxCustomers: string;
  }>({
    customMaxUsers: "",
    customMaxProducts: "",
    customMaxLocations: "",
    customMaxMembers: "",
    customMaxCustomers: "",
  });

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

  useEffect(() => {
    if (!tenant) return;
    setLimitOverrides({
      customMaxUsers:
        tenant.customMaxUsers != null ? String(tenant.customMaxUsers) : "",
      customMaxProducts:
        tenant.customMaxProducts != null
          ? String(tenant.customMaxProducts)
          : "",
      customMaxLocations:
        tenant.customMaxLocations != null
          ? String(tenant.customMaxLocations)
          : "",
      customMaxMembers:
        tenant.customMaxMembers != null ? String(tenant.customMaxMembers) : "",
      customMaxCustomers:
        tenant.customMaxCustomers != null
          ? String(tenant.customMaxCustomers)
          : "",
    });
  }, [tenant]);

  const parseOverride = (v: string): number | null => {
    const t = v.trim();
    if (t === "") return null;
    const n = parseInt(t, 10);
    return isNaN(n) ? null : n;
  };

  const handleSaveLimitOverrides = useCallback(async () => {
    if (!id) return;
    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          customMaxUsers: parseOverride(limitOverrides.customMaxUsers),
          customMaxProducts: parseOverride(limitOverrides.customMaxProducts),
          customMaxLocations: parseOverride(limitOverrides.customMaxLocations),
          customMaxMembers: parseOverride(limitOverrides.customMaxMembers),
          customMaxCustomers: parseOverride(limitOverrides.customMaxCustomers),
        },
      });
      toast({ title: "Limit overrides saved" });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to save overrides";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  }, [id, limitOverrides, updateMutation, toast]);

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

  const handleCloseCreateUser = useCallback(() => {
    setCreateUserOpen(false);
    setCreateUserUsername("");
    setCreateUserPassword("");
    setCreateUserConfirmPassword("");
    setCreateUserRole("user");
  }, []);

  const handleCreateUser = useCallback(async () => {
    if (!id) return;
    if (!createUserUsername.trim()) {
      toast({
        title: "Error",
        description: "Username is required",
        variant: "destructive",
      });
      return;
    }
    if (createUserPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }
    if (createUserPassword !== createUserConfirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    try {
      await createUserMutation.mutateAsync({
        tenantId: id,
        data: {
          username: createUserUsername.trim(),
          password: createUserPassword,
          role: createUserRole,
        },
      });
      toast({ title: "User created successfully" });
      handleCloseCreateUser();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create user";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  }, [
    id,
    createUserUsername,
    createUserPassword,
    createUserConfirmPassword,
    createUserRole,
    createUserMutation,
    toast,
    handleCloseCreateUser,
  ]);

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
        <div className="text-muted-foreground" role="status" aria-live="polite">
          Loading tenant…
        </div>
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

      <TenantNavTabs
        workspace={String(params.workspace ?? "")}
        tenantId={tenant.id}
        active="edit"
      />

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

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Limit overrides</CardTitle>
          <CardDescription>
            Override plan limits for this tenant. Leave empty to use plan
            default. Use -1 for unlimited.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customMaxUsers">Max users</Label>
              <Input
                id="customMaxUsers"
                type="number"
                min={-1}
                placeholder="Plan default"
                value={limitOverrides.customMaxUsers}
                onChange={(e) =>
                  setLimitOverrides((p) => ({
                    ...p,
                    customMaxUsers: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customMaxProducts">Max products</Label>
              <Input
                id="customMaxProducts"
                type="number"
                min={-1}
                placeholder="Plan default"
                value={limitOverrides.customMaxProducts}
                onChange={(e) =>
                  setLimitOverrides((p) => ({
                    ...p,
                    customMaxProducts: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customMaxLocations">Max locations</Label>
              <Input
                id="customMaxLocations"
                type="number"
                min={-1}
                placeholder="Plan default"
                value={limitOverrides.customMaxLocations}
                onChange={(e) =>
                  setLimitOverrides((p) => ({
                    ...p,
                    customMaxLocations: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customMaxMembers">Max members</Label>
              <Input
                id="customMaxMembers"
                type="number"
                min={-1}
                placeholder="Plan default"
                value={limitOverrides.customMaxMembers}
                onChange={(e) =>
                  setLimitOverrides((p) => ({
                    ...p,
                    customMaxMembers: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customMaxCustomers">Max customers</Label>
              <Input
                id="customMaxCustomers"
                type="number"
                min={-1}
                placeholder="Plan default"
                value={limitOverrides.customMaxCustomers}
                onChange={(e) =>
                  setLimitOverrides((p) => ({
                    ...p,
                    customMaxCustomers: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={handleSaveLimitOverrides}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Saving…" : "Save limit overrides"}
          </Button>
        </CardContent>
      </Card>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Create user</CardTitle>
          <CardDescription>
            Add a new user to this tenant. They can log in with their username
            and password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={() => setCreateUserOpen(true)}
          >
            <UserPlus className="mr-1 h-4 w-4" />
            Add user
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
                    aria-label={`Reset password for ${user.username}`}
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
        <DialogContent allowDismiss={false}>
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
                minLength={6}
                aria-describedby="newPassword-hint"
              />
              <p
                id="newPassword-hint"
                className="text-xs text-muted-foreground"
              >
                Must be at least 6 characters.
              </p>
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

      <Dialog
        open={createUserOpen}
        onOpenChange={(open) => !open && handleCloseCreateUser()}
      >
        <DialogContent allowDismiss={false}>
          <DialogHeader>
            <DialogTitle>Create user</DialogTitle>
            <DialogDescription>
              Add a new user to this tenant. They will log in with their
              username and password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="createUserUsername">Username</Label>
              <Input
                id="createUserUsername"
                type="text"
                value={createUserUsername}
                onChange={(e) => setCreateUserUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="createUserPassword">Password</Label>
              <Input
                id="createUserPassword"
                type="password"
                value={createUserPassword}
                onChange={(e) => setCreateUserPassword(e.target.value)}
                minLength={6}
                aria-describedby="createUserPassword-hint"
              />
              <p
                id="createUserPassword-hint"
                className="text-xs text-muted-foreground"
              >
                Must be at least 6 characters.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="createUserConfirmPassword">
                Confirm password
              </Label>
              <Input
                id="createUserConfirmPassword"
                type="password"
                value={createUserConfirmPassword}
                onChange={(e) => setCreateUserConfirmPassword(e.target.value)}
                placeholder="Confirm password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="createUserRole">Role</Label>
              <Select
                value={createUserRole}
                onValueChange={(v) =>
                  setCreateUserRole(v as "admin" | "user" | "superAdmin")
                }
              >
                <SelectTrigger id="createUserRole">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superAdmin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseCreateUser}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateUser}
              disabled={
                createUserMutation.isPending ||
                !createUserUsername.trim() ||
                createUserPassword.length < 6 ||
                createUserPassword !== createUserConfirmPassword
              }
            >
              {createUserMutation.isPending ? "Creating…" : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
