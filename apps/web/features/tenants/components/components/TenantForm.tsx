"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import type {
  Tenant,
  PlanTier,
  SubscriptionStatus,
} from "../../hooks/use-tenants";
import {
  TenantCreateFormSchema,
  TenantEditFormSchema,
  type TenantCreateFormInput,
  type TenantEditFormInput,
} from "../../validation";

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
  const form = useForm<TenantCreateFormInput>({
    resolver: zodResolver(TenantCreateFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      slug: "",
      plan: "STARTER",
      adminUsername: "",
      adminPassword: "",
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit({
      name: values.name.trim(),
      slug: values.slug.trim().toLowerCase().replace(/\s+/g, "-"),
      plan: values.plan as PlanTier,
      adminUsername: values.adminUsername.trim(),
      adminPassword: values.adminPassword,
    });
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="name">Organization name</Label>
        <Input
          id="name"
          {...form.register("name")}
          placeholder="Acme Corp"
          aria-invalid={form.formState.errors.name ? true : undefined}
          aria-describedby={
            form.formState.errors.name ? "create-name-error" : undefined
          }
        />
        {form.formState.errors.name && (
          <p
            id="create-name-error"
            role="alert"
            className="text-sm text-destructive mt-1"
          >
            {form.formState.errors.name.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">Slug (URL identifier)</Label>
        <Controller
          name="slug"
          control={form.control}
          render={({ field }) => (
            <Input
              id="slug"
              {...field}
              placeholder="acme"
              onChange={(e) =>
                field.onChange(
                  e.target.value.toLowerCase().replace(/\s+/g, "-"),
                )
              }
              aria-invalid={form.formState.errors.slug ? true : undefined}
              aria-describedby={
                form.formState.errors.slug
                  ? "create-slug-error create-slug-hint"
                  : "create-slug-hint"
              }
            />
          )}
        />
        {form.formState.errors.slug && (
          <p
            id="create-slug-error"
            role="alert"
            className="text-sm text-destructive mt-1"
          >
            {form.formState.errors.slug.message}
          </p>
        )}
        <p id="create-slug-hint" className="text-xs text-muted-foreground">
          Lowercase letters, numbers, hyphens only (e.g. acme, my-org).
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="plan">Plan</Label>
        <Controller
          name="plan"
          control={form.control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="plan" aria-label="Plan">
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
          )}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="adminUsername">Initial admin username</Label>
        <Input
          id="adminUsername"
          {...form.register("adminUsername")}
          placeholder="admin"
          aria-invalid={form.formState.errors.adminUsername ? true : undefined}
          aria-describedby={
            form.formState.errors.adminUsername
              ? "create-adminUsername-error"
              : undefined
          }
        />
        {form.formState.errors.adminUsername && (
          <p
            id="create-adminUsername-error"
            role="alert"
            className="text-sm text-destructive mt-1"
          >
            {form.formState.errors.adminUsername.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="adminPassword">Initial admin password</Label>
        <Input
          id="adminPassword"
          type="password"
          {...form.register("adminPassword")}
          placeholder="••••••••"
          aria-invalid={form.formState.errors.adminPassword ? true : undefined}
          aria-describedby={
            form.formState.errors.adminPassword
              ? "create-adminPassword-error create-adminPassword-hint"
              : "create-adminPassword-hint"
          }
        />
        <p
          id="create-adminPassword-hint"
          className="text-xs text-muted-foreground"
        >
          Must be at least 8 characters.
        </p>
        {form.formState.errors.adminPassword && (
          <p
            id="create-adminPassword-error"
            role="alert"
            className="text-sm text-destructive mt-1"
          >
            {form.formState.errors.adminPassword.message}
          </p>
        )}
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
  const form = useForm<TenantEditFormInput>({
    resolver: zodResolver(TenantEditFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: tenant.name,
      slug: tenant.slug,
      isActive: tenant.isActive,
      subscriptionStatus: tenant.subscriptionStatus,
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit({
      name: values.name.trim(),
      slug: values.slug.trim().toLowerCase(),
      isActive: values.isActive,
      subscriptionStatus: values.subscriptionStatus as SubscriptionStatus,
    });
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="name">Organization name</Label>
        <Input
          id="name"
          {...form.register("name")}
          aria-invalid={form.formState.errors.name ? true : undefined}
          aria-describedby={
            form.formState.errors.name ? "edit-name-error" : undefined
          }
        />
        {form.formState.errors.name && (
          <p
            id="edit-name-error"
            role="alert"
            className="text-sm text-destructive mt-1"
          >
            {form.formState.errors.name.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Controller
          name="slug"
          control={form.control}
          render={({ field }) => (
            <Input
              id="slug"
              {...field}
              onChange={(e) => field.onChange(e.target.value.toLowerCase())}
              aria-invalid={form.formState.errors.slug ? true : undefined}
              aria-describedby={
                form.formState.errors.slug ? "edit-slug-error" : undefined
              }
            />
          )}
        />
        {form.formState.errors.slug && (
          <p
            id="edit-slug-error"
            role="alert"
            className="text-sm text-destructive mt-1"
          >
            {form.formState.errors.slug.message}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Controller
          name="isActive"
          control={form.control}
          render={({ field }) => (
            <Switch
              id="isActive"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label
          htmlFor="isActive"
          className="text-sm font-normal cursor-pointer"
        >
          Active (tenant can access the system)
        </Label>
      </div>
      <div className="space-y-2">
        <Label htmlFor="subscriptionStatus">Subscription status</Label>
        <Controller
          name="subscriptionStatus"
          control={form.control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(v) =>
                field.onChange(v as TenantEditFormInput["subscriptionStatus"])
              }
            >
              <SelectTrigger
                id="subscriptionStatus"
                aria-label="Subscription status"
              >
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
          )}
        />
        {form.formState.errors.subscriptionStatus && (
          <p className="text-sm text-destructive mt-1" role="alert">
            {form.formState.errors.subscriptionStatus.message}
          </p>
        )}
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
