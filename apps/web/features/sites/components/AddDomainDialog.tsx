"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/useToast";
import { AddDomainFormSchema, type AddDomainFormInput } from "../validation";
import { useCreateTenantDomain } from "../hooks/use-tenant-domains";
import { useAddMyDomain } from "../hooks/use-my-domains";

interface AddDomainDialogProps {
  /**
   * Platform-admin mode: pass the target tenantId to use the platform-admin API.
   * Omit (or pass undefined) to use the tenant-self API (/tenants/me/domains).
   */
  tenantId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDomainDialog({
  tenantId,
  open,
  onOpenChange,
}: AddDomainDialogProps) {
  const { toast } = useToast();
  // Both hooks are called unconditionally to satisfy React's rules of hooks.
  // Only one is used based on whether a tenantId was provided.
  const platformMutation = useCreateTenantDomain(tenantId ?? "");
  const selfMutation = useAddMyDomain();
  const createMutation = tenantId ? platformMutation : selfMutation;

  const form = useForm<AddDomainFormInput>({
    resolver: zodResolver(AddDomainFormSchema),
    mode: "onBlur",
    defaultValues: {
      hostname: "",
      appType: "WEBSITE",
      isPrimary: false,
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await createMutation.mutateAsync(values);
      toast({ title: "Domain added", description: values.hostname });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Failed to add domain",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  });

  const appType = form.watch("appType");
  const isPrimary = form.watch("isPrimary");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) form.reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add domain</DialogTitle>
          <DialogDescription>
            Register a hostname for this tenant. The customer will need to point
            DNS to the platform before the domain is verified.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="hostname">Hostname</Label>
            <Input
              id="hostname"
              placeholder="www.acme.com"
              autoComplete="off"
              {...form.register("hostname")}
              aria-invalid={form.formState.errors.hostname ? true : undefined}
              aria-describedby={
                form.formState.errors.hostname ? "hostname-error" : undefined
              }
            />
            {form.formState.errors.hostname && (
              <p id="hostname-error" className="text-sm text-destructive">
                {form.formState.errors.hostname.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="appType">App</Label>
            <Select
              value={appType}
              onValueChange={(v) =>
                form.setValue("appType", v as AddDomainFormInput["appType"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger
                id="appType"
                aria-label="App type"
                aria-describedby="appType-hint"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WEBSITE">Website (public)</SelectItem>
                <SelectItem value="IMS">IMS (admin)</SelectItem>
                <SelectItem value="API">API</SelectItem>
              </SelectContent>
            </Select>
            <p id="appType-hint" className="text-xs text-muted-foreground">
              WEBSITE domains require the website feature to be enabled first.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div className="space-y-0.5">
              <Label htmlFor="isPrimary">Primary domain</Label>
              <p className="text-xs text-muted-foreground">
                Mark as the canonical hostname for this app type.
              </p>
            </div>
            <Switch
              id="isPrimary"
              checked={isPrimary}
              onCheckedChange={(v) => form.setValue("isPrimary", v)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding…" : "Add domain"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
