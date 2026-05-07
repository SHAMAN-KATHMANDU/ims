"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Globe,
  CheckCircle2,
  Clock,
  Trash2,
  AlertCircle,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/useToast";
import {
  useMyDomains,
  useDeleteMyDomain,
  useAddMyDomain,
  useVerifyMyDomain,
  useMyDomainVerificationInstructions,
  type TenantDomain,
  type DomainVerificationInstructions,
} from "@/features/sites";

export function DomainPanel() {
  const [addOpen, setAddOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<TenantDomain | null>(null);
  const [newHostname, setNewHostname] = useState("");
  const domainsQuery = useMyDomains();
  const createDomain = useAddMyDomain();
  const deleteDomain = useDeleteMyDomain();
  const { toast } = useToast();

  const handleCreateDomain = async (): Promise<void> => {
    if (!newHostname.trim()) {
      toast({ title: "Enter a domain", variant: "destructive" });
      return;
    }
    try {
      await createDomain.mutateAsync({
        hostname: newHostname.trim(),
        appType: "WEBSITE",
      });
      setNewHostname("");
      setAddOpen(false);
      toast({ title: "Domain added", description: "Verify DNS to activate." });
    } catch (error) {
      toast({
        title: "Failed to add domain",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (domain: TenantDomain): void => {
    if (!confirm(`Remove ${domain.hostname}?`)) return;
    deleteDomain.mutate(domain.id, {
      onSuccess: () => toast({ title: "Domain removed" }),
      onError: () =>
        toast({ title: "Failed to remove domain", variant: "destructive" }),
    });
  };

  const domains = domainsQuery.data ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="h-11 px-4 flex items-center border-b border-border shrink-0">
        <span className="text-sm font-semibold text-foreground flex-1">
          Domains
        </span>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Plus size={14} />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add domain</DialogTitle>
              <DialogDescription>
                Enter the hostname you want to point at this site. You&apos;ll
                verify DNS ownership next.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="domain-input">Hostname</Label>
                <Input
                  id="domain-input"
                  placeholder="example.com or shop.example.com"
                  value={newHostname}
                  onChange={(e) => setNewHostname(e.target.value)}
                  disabled={createDomain.isPending}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateDomain();
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddOpen(false);
                    setNewHostname("");
                  }}
                  disabled={createDomain.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateDomain}
                  disabled={createDomain.isPending}
                >
                  {createDomain.isPending ? "Adding…" : "Add domain"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {domainsQuery.isLoading && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Loading domains…
          </div>
        )}

        {!domainsQuery.isLoading && domains.length === 0 && (
          <div className="text-center py-8 rounded-lg border border-dashed border-border bg-muted/30 space-y-2">
            <Globe className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <div className="text-sm font-medium text-foreground/80">
              No custom domains
            </div>
            <div className="text-xs text-muted-foreground">
              Add one to point a domain at your site.
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add domain
            </Button>
          </div>
        )}

        {domains.map((domain) => (
          <DomainCard
            key={domain.id}
            domain={domain}
            onDelete={handleDelete}
            onOpenVerify={() => setVerifyTarget(domain)}
          />
        ))}
      </div>

      {verifyTarget && (
        <VerifyDomainDialog
          domain={verifyTarget}
          onClose={() => setVerifyTarget(null)}
        />
      )}
    </div>
  );
}

interface DomainCardProps {
  domain: TenantDomain;
  onDelete: (domain: TenantDomain) => void;
  onOpenVerify: () => void;
}

function DomainCard({ domain, onDelete, onOpenVerify }: DomainCardProps) {
  const isVerified = Boolean(domain.verifiedAt);
  return (
    <div className="p-3 rounded-md border border-border bg-card space-y-2">
      <div className="flex items-start gap-2">
        <Globe size={14} className="shrink-0 text-muted-foreground mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground truncate text-sm">
            {domain.hostname}
          </div>
          <div className="text-xs flex items-center gap-1.5 mt-1">
            {isVerified ? (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <CheckCircle2 size={11} />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-600">
                <Clock size={11} />
                Pending DNS
              </span>
            )}
            {domain.isPrimary && (
              <span className="px-1.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                Primary
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {!isVerified && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={onOpenVerify}
          >
            Verify DNS
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-xs h-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(domain)}
        >
          <Trash2 size={12} className="mr-1" />
          Remove
        </Button>
      </div>
    </div>
  );
}

interface VerifyDomainDialogProps {
  domain: TenantDomain;
  onClose: () => void;
}

const VERIFY_POLL_INTERVAL_MS = 10_000;
const VERIFY_POLL_MAX_MS = 2 * 60 * 1000;

function VerifyDomainDialog({ domain, onClose }: VerifyDomainDialogProps) {
  const { toast } = useToast();
  const verifyMutation = useVerifyMyDomain();
  const instructionsQuery = useMyDomainVerificationInstructions(domain.id);
  const [polling, setPolling] = useState(false);
  const [pollStartedAt, setPollStartedAt] = useState<number | null>(null);

  // Poll the verify endpoint every 10 s for up to 2 min while DNS propagates.
  useEffect(() => {
    if (!polling) return;
    const tick = async (): Promise<void> => {
      try {
        const result = await verifyMutation.mutateAsync(domain.id);
        if (result.verifiedAt) {
          setPolling(false);
          toast({ title: "Domain verified" });
          onClose();
          return;
        }
      } catch {
        // swallow — keep polling until timeout
      }
      if (
        pollStartedAt !== null &&
        Date.now() - pollStartedAt > VERIFY_POLL_MAX_MS
      ) {
        setPolling(false);
        toast({
          title: "Still pending",
          description:
            "DNS can take up to 48 hours to propagate. Try again later.",
          variant: "destructive",
        });
      }
    };
    const interval = setInterval(tick, VERIFY_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutateAsync is stable; including it would loop the effect
  }, [polling, pollStartedAt, domain.id, onClose]);

  const handleVerifyNow = async (): Promise<void> => {
    try {
      const result = await verifyMutation.mutateAsync(domain.id);
      if (result.verifiedAt) {
        toast({ title: "Domain verified" });
        onClose();
        return;
      }
      setPolling(true);
      setPollStartedAt(Date.now());
      toast({
        title: "Waiting for DNS",
        description:
          "We'll keep checking every 10 seconds for the next 2 minutes.",
      });
    } catch (error) {
      toast({
        title: "Verification failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const instructions = instructionsQuery.data;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Verify {domain.hostname}</DialogTitle>
          <DialogDescription>
            Add the records below at your DNS registrar, then click &quot;Check
            DNS&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3 flex gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-200">
              DNS changes can take up to 48 hours to propagate. Most providers
              update within a few minutes.
            </p>
          </div>

          {instructionsQuery.isLoading && (
            <div className="text-xs text-muted-foreground py-4 text-center">
              Loading DNS instructions…
            </div>
          )}

          {instructions && (
            <>
              <DnsRecord
                label="A record"
                fields={[
                  { name: "Name", value: instructions.aRecordName },
                  { name: "Type", value: "A" },
                  {
                    name: "Value",
                    value:
                      instructions.aRecordValue ||
                      "(platform IP not configured)",
                  },
                ]}
              />
              <DnsRecord
                label="TXT record (ownership)"
                fields={[
                  { name: "Name", value: instructions.txtName },
                  { name: "Type", value: "TXT" },
                  { name: "Value", value: instructions.txtValue },
                ]}
              />
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              size="sm"
              onClick={handleVerifyNow}
              disabled={verifyMutation.isPending || polling}
            >
              {polling
                ? "Polling…"
                : verifyMutation.isPending
                  ? "Checking…"
                  : "Check DNS"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DnsRecord({
  label,
  fields,
}: {
  label: string;
  fields: { name: string; value: string }[];
}) {
  const { toast } = useToast();
  const copy = (value: string): void => {
    navigator.clipboard.writeText(value).then(() => {
      toast({ title: "Copied" });
    });
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="bg-muted p-2 rounded text-xs font-mono border border-border space-y-1">
        {fields.map((f) => (
          <div key={f.name} className="flex items-start gap-2">
            <span className="text-muted-foreground w-12 shrink-0">
              {f.name}:
            </span>
            <span className="flex-1 break-all">{f.value}</span>
            <button
              type="button"
              onClick={() => copy(f.value)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              title={`Copy ${f.name.toLowerCase()}`}
            >
              <Copy size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export type { DomainVerificationInstructions };
