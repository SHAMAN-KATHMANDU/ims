"use client";

import { useState } from "react";
import { useCreateTenant } from "@/hooks/useTenant";
import { usePlans } from "@/hooks/usePlatformBilling";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PlanTier } from "@/hooks/useTenant";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface CreateTenantFormData {
  name: string;
  slug: string;
  plan: string;
  adminUsername: string;
  adminPassword: string;
  confirmPassword: string;
}

const INITIAL_FORM: CreateTenantFormData = {
  name: "",
  slug: "",
  plan: "",
  adminUsername: "",
  adminPassword: "",
  confirmPassword: "",
};

interface CreateTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * Shared create-tenant dialog used by both platform tenants and billing tenants.
 */
export function CreateTenantDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateTenantDialogProps) {
  const createMutation = useCreateTenant();
  const { data: plans = [] } = usePlans();
  const { toast } = useToast();
  const [form, setForm] = useState<CreateTenantFormData>(INITIAL_FORM);

  const handleNameChange = (name: string) => {
    setForm((prev) => ({ ...prev, name, slug: slugify(name) }));
  };

  const isValid =
    form.name.trim().length > 0 &&
    form.slug.trim().length > 0 &&
    form.adminUsername.trim().length > 0 &&
    form.adminPassword.length >= 6 &&
    form.adminPassword === form.confirmPassword;

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast({ title: "Organization name is required", variant: "destructive" });
      return;
    }
    if (form.adminPassword.length < 6) {
      toast({
        title: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }
    if (form.adminPassword !== form.confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    const planTier = (form.plan || "STARTER") as PlanTier;
    try {
      await createMutation.mutateAsync({
        name: form.name.trim(),
        slug: form.slug,
        plan: planTier,
        adminUsername: form.adminUsername.trim(),
        adminPassword: form.adminPassword,
      });
      toast({ title: "Tenant created successfully" });
      onOpenChange(false);
      setForm(INITIAL_FORM);
      onSuccess?.();
    } catch {
      toast({ title: "Failed to create tenant", variant: "destructive" });
    }
  };

  const handleClose = (v: boolean) => {
    if (!v) setForm(INITIAL_FORM);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Tenant</DialogTitle>
          <DialogDescription>
            Set up a new organization with an admin account.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="tenant-name">Organization Name</Label>
            <Input
              id="tenant-name"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tenant-slug">Slug</Label>
            <Input
              id="tenant-slug"
              value={form.slug}
              onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
              placeholder="auto-generated from name"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, hyphens only (e.g. acme, my-org).
            </p>
          </div>
          <div className="grid gap-2">
            <Label>Plan</Label>
            <Select
              value={form.plan || "STARTER"}
              onValueChange={(v) => setForm((p) => ({ ...p, plan: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.length > 0 ? (
                  plans.map((p) => (
                    <SelectItem key={p.id} value={p.tier}>
                      {p.name} ({p.tier})
                    </SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="STARTER">Starter</SelectItem>
                    <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                    <SelectItem value="BUSINESS">Business</SelectItem>
                    <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="admin-username">Admin Username</Label>
            <Input
              id="admin-username"
              value={form.adminUsername}
              onChange={(e) =>
                setForm((p) => ({ ...p, adminUsername: e.target.value }))
              }
              placeholder="admin"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={form.adminPassword}
                onChange={(e) =>
                  setForm((p) => ({ ...p, adminPassword: e.target.value }))
                }
                placeholder="Min 6 characters"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm((p) => ({ ...p, confirmPassword: e.target.value }))
                }
                placeholder="Re-enter password"
              />
            </div>
          </div>
          {form.adminPassword.length > 0 && form.adminPassword.length < 6 && (
            <p className="text-sm text-destructive">
              Password must be at least 6 characters
            </p>
          )}
          {form.confirmPassword.length > 0 &&
            form.adminPassword !== form.confirmPassword && (
              <p className="text-sm text-destructive">Passwords do not match</p>
            )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending || !isValid}
          >
            {createMutation.isPending ? "Creating..." : "Create Tenant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
