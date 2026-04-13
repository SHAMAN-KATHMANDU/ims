"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { changePassword } from "@/features/users";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Globe,
  ChevronRight,
} from "lucide-react";
import { useEnvFeatureFlag, EnvFeature } from "@/features/flags";
import { useAuthStore, selectUser } from "@/store/auth-store";
import {
  useTenantPaymentMethods,
  useUpdateTenantPaymentMethods,
  type TenantPaymentMethodConfig,
} from "..";

// Zod schema for password change validation
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(1, "New password is required")
      .min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export function SettingsPage() {
  const { toast } = useToast();
  const currentUser = useAuthStore(selectUser);
  const params = useParams();
  const workspace = String(params.workspace ?? "");
  const tenantWebsitesEnabled = useEnvFeatureFlag(EnvFeature.TENANT_WEBSITES);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newMethodLabel, setNewMethodLabel] = useState("");
  const [newMethodCode, setNewMethodCode] = useState("");
  const [draftMethods, setDraftMethods] = useState<TenantPaymentMethodConfig[]>(
    [],
  );
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);

  const paymentMethodsQuery = useTenantPaymentMethods();
  const updatePaymentMethodsMutation = useUpdateTenantPaymentMethods();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    mode: "onBlur",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: PasswordFormValues) => {
    try {
      if (!currentUser?.id) {
        toast({
          title: "Error",
          description: "User information not available. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      await changePassword(currentUser.id, data.newPassword);

      toast({
        title: "Password changed successfully",
        description: "Your password has been updated.",
      });

      reset();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to change password";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!hasHydratedDraft && paymentMethodsQuery.data?.paymentMethods) {
      setDraftMethods(paymentMethodsQuery.data.paymentMethods);
      setHasHydratedDraft(true);
    }
  }, [hasHydratedDraft, paymentMethodsQuery.data?.paymentMethods]);

  const sortByOrder = (methods: TenantPaymentMethodConfig[]) =>
    [...methods].sort((a, b) => a.order - b.order);

  const setMethods = (next: TenantPaymentMethodConfig[]) => {
    setDraftMethods(
      sortByOrder(next).map((method, index) => ({ ...method, order: index })),
    );
  };

  const addPaymentMethod = () => {
    const label = newMethodLabel.trim();
    const code = newMethodCode.trim().toUpperCase();
    if (!label || !code) return;
    if (!/^[A-Z0-9_]{2,32}$/.test(code)) {
      toast({
        title: "Invalid code",
        description: "Use uppercase letters, numbers, or underscores only.",
        variant: "destructive",
      });
      return;
    }
    if (draftMethods.some((method) => method.code === code)) {
      toast({
        title: "Duplicate code",
        description: "Payment method code already exists.",
        variant: "destructive",
      });
      return;
    }
    setMethods([
      ...draftMethods,
      {
        id: `pm_${crypto.randomUUID()}`,
        code,
        label,
        enabled: true,
        order: draftMethods.length,
      },
    ]);
    setNewMethodLabel("");
    setNewMethodCode("");
  };

  const moveMethod = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draftMethods.length) return;
    const next = [...draftMethods];
    const [method] = next.splice(index, 1);
    if (!method) return;
    next.splice(nextIndex, 0, method);
    setMethods(next);
  };

  const removeMethod = (id: string) => {
    const target = draftMethods.find((method) => method.id === id);
    if (!target) return;
    const enabledCount = draftMethods.filter((method) => method.enabled).length;
    if (target.enabled && enabledCount <= 1) {
      toast({
        title: "Cannot remove",
        description: "At least one enabled payment method is required.",
        variant: "destructive",
      });
      return;
    }
    setMethods(draftMethods.filter((method) => method.id !== id));
  };

  const toggleEnabled = (id: string) => {
    const target = draftMethods.find((method) => method.id === id);
    if (!target) return;
    const enabledCount = draftMethods.filter((method) => method.enabled).length;
    if (target.enabled && enabledCount <= 1) {
      toast({
        title: "Cannot disable",
        description: "At least one enabled payment method is required.",
        variant: "destructive",
      });
      return;
    }
    setMethods(
      draftMethods.map((method) =>
        method.id === id ? { ...method, enabled: !method.enabled } : method,
      ),
    );
  };

  const updateLabel = (id: string, label: string) => {
    setMethods(
      draftMethods.map((method) =>
        method.id === id ? { ...method, label } : method,
      ),
    );
  };

  const updateCode = (id: string, code: string) => {
    const normalized = code.toUpperCase().replace(/[^A-Z0-9_]/g, "");
    setMethods(
      draftMethods.map((method) =>
        method.id === id ? { ...method, code: normalized } : method,
      ),
    );
  };

  const savePaymentMethods = () => {
    const hasEnabled = draftMethods.some((method) => method.enabled);
    if (!hasEnabled) {
      toast({
        title: "Cannot save",
        description: "At least one enabled payment method is required.",
        variant: "destructive",
      });
      return;
    }
    const duplicateCodes = new Set<string>();
    for (const method of draftMethods) {
      if (!method.label.trim() || !method.code.trim()) {
        toast({
          title: "Cannot save",
          description: "Each payment method needs both label and code.",
          variant: "destructive",
        });
        return;
      }
      if (!/^[A-Z0-9_]{2,32}$/.test(method.code)) {
        toast({
          title: "Invalid code",
          description: `Invalid method code: ${method.code}`,
          variant: "destructive",
        });
        return;
      }
      if (duplicateCodes.has(method.code)) {
        toast({
          title: "Duplicate code",
          description: `Duplicate method code: ${method.code}`,
          variant: "destructive",
        });
        return;
      }
      duplicateCodes.add(method.code);
    }
    updatePaymentMethodsMutation.mutate(draftMethods);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account and preferences
        </p>
      </div>

      {/* Website editor entry — feature-flagged via TENANT_WEBSITES */}
      {tenantWebsitesEnabled && (
        <Link
          href={`/${workspace}/settings/site`}
          className="block rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Globe className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium">Website</div>
              <div className="text-sm text-muted-foreground">
                Branding, template, and publishing for your public storefront
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>
      )}

      {/* User Info Card (Read-only) */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Account Information</CardTitle>
          <CardDescription className="text-base">
            Your account details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Username
              </Label>
              <div className="text-2xl font-semibold text-foreground">
                {currentUser?.username || "N/A"}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Role
              </Label>
              <div className="text-2xl font-semibold text-foreground capitalize">
                {currentUser?.role || "N/A"}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Account Created
              </Label>
              <div className="text-2xl font-semibold text-foreground">
                {currentUser?.createdAt
                  ? new Date(currentUser.createdAt).toLocaleDateString()
                  : "N/A"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure. You must enter
            your current password to change it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Enter your current password"
                  disabled={isSubmitting}
                  className="pr-10"
                  {...register("currentPassword")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  disabled={isSubmitting}
                  aria-label={
                    showCurrentPassword ? "Hide password" : "Show password"
                  }
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.currentPassword && (
                <p className="text-sm text-destructive">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter your new password"
                  disabled={isSubmitting}
                  className="pr-10"
                  {...register("newPassword")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={isSubmitting}
                  aria-label={
                    showNewPassword ? "Hide password" : "Show password"
                  }
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.newPassword && (
                <p className="text-sm text-destructive">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  disabled={isSubmitting}
                  className="pr-10"
                  {...register("confirmPassword")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isSubmitting}
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Changing Password..." : "Change Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Sales Payment Methods</CardTitle>
          <CardDescription>
            Customize payment options for this workspace. These options appear
            in New Sale.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
            <Input
              placeholder="Label (e.g. Bank Transfer)"
              value={newMethodLabel}
              onChange={(e) => setNewMethodLabel(e.target.value)}
            />
            <Input
              placeholder="Code (e.g. BANK_TRANSFER)"
              value={newMethodCode}
              onChange={(e) =>
                setNewMethodCode(
                  e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
                )
              }
            />
            <Button type="button" onClick={addPaymentMethod} className="gap-2">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {paymentMethodsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading methods...</p>
          ) : (
            <div className="space-y-2">
              {draftMethods.map((method, index) => (
                <div
                  key={method.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-2 items-center border rounded-md p-2"
                >
                  <Input
                    value={method.label}
                    onChange={(e) => updateLabel(method.id, e.target.value)}
                  />
                  <Input
                    value={method.code}
                    onChange={(e) => updateCode(method.id, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant={method.enabled ? "default" : "outline"}
                    onClick={() => toggleEnabled(method.id)}
                  >
                    {method.enabled ? "Enabled" : "Disabled"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => moveMethod(index, -1)}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => moveMethod(index, 1)}
                    disabled={index === draftMethods.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => removeMethod(method.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={savePaymentMethods}
              disabled={updatePaymentMethodsMutation.isPending}
            >
              {updatePaymentMethodsMutation.isPending
                ? "Saving..."
                : "Save Payment Methods"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
