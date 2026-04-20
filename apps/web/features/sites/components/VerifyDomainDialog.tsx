"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/useToast";
import { Copy, CheckCircle2, Loader2 } from "lucide-react";
import {
  useDomainVerificationInstructions,
  useVerifyTenantDomain,
  type TenantDomain,
} from "../hooks/use-tenant-domains";

interface VerifyDomainDialogProps {
  domain: TenantDomain | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({ title: `${label} copied` });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onClick}
      className="h-7 px-2"
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
    >
      {copied ? (
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </Button>
  );
}

export function VerifyDomainDialog({
  domain,
  open,
  onOpenChange,
}: VerifyDomainDialogProps) {
  const { toast } = useToast();
  const instructions = useDomainVerificationInstructions(
    open && domain ? domain.id : null,
  );
  const verifyMutation = useVerifyTenantDomain();

  const handleVerify = async () => {
    if (!domain) return;
    try {
      await verifyMutation.mutateAsync(domain.id);
      toast({
        title: "Domain verified",
        description: domain.hostname,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Verification failed",
        description:
          error instanceof Error
            ? error.message
            : "DNS record not found or mismatched",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify domain</DialogTitle>
          <DialogDescription>
            Ask the customer to add this TXT record at their DNS provider, then
            click Verify.
          </DialogDescription>
        </DialogHeader>

        {instructions.isLoading ? (
          <div
            className="py-8 text-center text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <Loader2
              className="mx-auto h-5 w-5 animate-spin"
              aria-hidden="true"
            />
            <span className="sr-only">Loading verification instructions…</span>
          </div>
        ) : instructions.data ? (
          <div className="space-y-4 py-2">
            <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase text-muted-foreground">
                    Name
                  </div>
                  <div className="truncate">{instructions.data.txtName}</div>
                </div>
                <CopyButton
                  value={instructions.data.txtName}
                  label="TXT name"
                />
              </div>
              <div className="mt-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase text-muted-foreground">
                    Value
                  </div>
                  <div className="truncate">{instructions.data.txtValue}</div>
                </div>
                <CopyButton
                  value={instructions.data.txtValue}
                  label="TXT value"
                />
              </div>
            </div>

            {instructions.data.verifiedAt && (
              <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300">
                Already verified on{" "}
                {new Date(instructions.data.verifiedAt).toLocaleString()}.
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={handleVerify}
            disabled={verifyMutation.isPending || !domain}
          >
            {verifyMutation.isPending ? "Verifying…" : "Verify now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
