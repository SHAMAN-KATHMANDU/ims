"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tenant, PlanTier, SubscriptionStatus } from "@/hooks/useTenant";

const PLANS: PlanTier[] = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
const STATUSES: SubscriptionStatus[] = [
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "SUSPENDED",
  "LOCKED",
  "CANCELLED",
];

interface TenantFormCreateProps {
  mode: "create";
  onSubmit: (data: {
    name: string;
    slug: string;
    plan: PlanTier;
    adminUsername: string;
    adminPassword: string;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface TenantFormEditProps {
  mode: "edit";
  tenant: Tenant;
  onSubmit: (data: {
    name: string;
    slug: string;
    isActive: boolean;
    subscriptionStatus: SubscriptionStatus;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

type TenantFormProps = TenantFormCreateProps | TenantFormEditProps;

export function TenantForm(props: TenantFormProps) {
  if (props.mode === "create") {
    return <TenantFormCreate {...props} />;
  }
  return <TenantFormEdit {...props} />;
}

function TenantFormCreate({
  onSubmit,
  onCancel,
  isLoading,
}: TenantFormCreateProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState<PlanTier>("STARTER");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name: name.trim(),
      slug: slug.trim().toLowerCase().replace(/\s+/g, "-"),
      plan,
      adminUsername: adminUsername.trim(),
      adminPassword,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="name">Organization name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Corp"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">Slug (URL identifier)</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) =>
            setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
          }
          placeholder="acme"
          required
        />
        <p className="text-xs text-muted-foreground">
          Lowercase letters, numbers, hyphens only (e.g. acme, my-org).
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="plan">Plan</Label>
        <Select value={plan} onValueChange={(v) => setPlan(v as PlanTier)}>
          <SelectTrigger id="plan">
            <SelectValue />
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
        <Label htmlFor="adminUsername">Initial admin username</Label>
        <Input
          id="adminUsername"
          value={adminUsername}
          onChange={(e) => setAdminUsername(e.target.value)}
          placeholder="admin"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="adminPassword">Initial admin password</Label>
        <Input
          id="adminPassword"
          type="password"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Creating…" : "Create tenant"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function TenantFormEdit({
  tenant,
  onSubmit,
  onCancel,
  isLoading,
}: TenantFormEditProps) {
  const [name, setName] = useState(tenant.name);
  const [slug, setSlug] = useState(tenant.slug);
  const [isActive, setIsActive] = useState(tenant.isActive);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus>(tenant.subscriptionStatus);

  useEffect(() => {
    setName(tenant.name);
    setSlug(tenant.slug);
    setIsActive(tenant.isActive);
    setSubscriptionStatus(tenant.subscriptionStatus);
  }, [tenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name: name.trim(),
      slug: slug.trim(),
      isActive,
      subscriptionStatus,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="name">Organization name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          required
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="isActive"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
        <Label htmlFor="isActive">Active (tenant can access the system)</Label>
      </div>
      <div className="space-y-2">
        <Label htmlFor="subscriptionStatus">Subscription status</Label>
        <Select
          value={subscriptionStatus}
          onValueChange={(v) => setSubscriptionStatus(v as SubscriptionStatus)}
        >
          <SelectTrigger id="subscriptionStatus">
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
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
