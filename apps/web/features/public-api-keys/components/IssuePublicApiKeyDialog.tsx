"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Check, AlertTriangle } from "lucide-react";
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
import { useToast } from "@/hooks/useToast";
import { useCreatePublicApiKey } from "../hooks/use-public-api-keys";
import {
  CreatePublicApiKeySchema,
  type CreatePublicApiKeyInput,
} from "../validation";

interface VerifiedDomainOption {
  id: string;
  hostname: string;
}

interface Props {
  /** Verified domains the new key may be bound to. */
  verifiedDomains: VerifiedDomainOption[];
  /** Pre-select a domain (when opened from a per-domain row). */
  defaultDomainId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IssuePublicApiKeyDialog({
  verifiedDomains,
  defaultDomainId,
  open,
  onOpenChange,
}: Props) {
  const { toast } = useToast();
  const createMutation = useCreatePublicApiKey();
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<CreatePublicApiKeyInput>({
    resolver: zodResolver(CreatePublicApiKeySchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      tenantDomainId: defaultDomainId ?? verifiedDomains[0]?.id ?? "",
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await createMutation.mutateAsync({
        name: values.name,
        tenantDomainId: values.tenantDomainId,
        rateLimitPerMin: values.rateLimitPerMin,
      });
      setIssuedKey(result.key);
    } catch (error) {
      toast({
        title: "Failed to issue API key",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  });

  const handleCopy = async () => {
    if (!issuedKey) return;
    try {
      await navigator.clipboard.writeText(issuedKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({
        title: "Copy failed",
        description: "Select and copy the key manually.",
        variant: "destructive",
      });
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setIssuedKey(null);
      setCopied(false);
      form.reset();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        {!issuedKey ? (
          <>
            <DialogHeader>
              <DialogTitle>Issue public API key</DialogTitle>
              <DialogDescription>
                Bind a new read-only API key to a verified domain. Requests
                using this key must come from the bound domain&apos;s origin.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="api-key-name">Name</Label>
                <Input
                  id="api-key-name"
                  placeholder="e.g. shop.acme.com production"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-key-domain">Bound domain</Label>
                {verifiedDomains.length === 0 ? (
                  <div className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>
                      You don&apos;t have any DNS-verified domains yet. Add and
                      verify a domain first.
                    </span>
                  </div>
                ) : (
                  <Select
                    value={form.watch("tenantDomainId")}
                    onValueChange={(v) => form.setValue("tenantDomainId", v)}
                  >
                    <SelectTrigger id="api-key-domain">
                      <SelectValue placeholder="Choose a verified domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {verifiedDomains.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.hostname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {form.formState.errors.tenantDomainId && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.tenantDomainId.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-key-rate-limit">
                  Rate limit (requests / minute, optional)
                </Label>
                <Input
                  id="api-key-rate-limit"
                  type="number"
                  min={1}
                  max={10000}
                  placeholder="120"
                  {...form.register("rateLimitPerMin")}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleClose(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || verifiedDomains.length === 0
                  }
                >
                  {createMutation.isPending ? "Issuing…" : "Issue key"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Copy this key now</DialogTitle>
              <DialogDescription>
                This is the only time you&apos;ll see the full key. Store it
                somewhere safe — we only keep a hashed copy.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="flex items-stretch gap-2">
                <code className="flex-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs font-mono break-all">
                  {issuedKey}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  aria-label="Copy API key"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Send this in the <code>Authorization: Bearer …</code> header on
                requests to <code>/public/v1/*</code>. Requests must come from
                the bound domain&apos;s origin.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
