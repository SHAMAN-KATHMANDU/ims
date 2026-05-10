"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Globe,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Shield,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import {
  Empty,
  EmptyMedia,
  EmptyContent,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/useToast";
import {
  useMyDomains,
  useAddMyDomain,
  useDeleteMyDomain,
  useUpdateMyDomain,
  useVerifyMyDomain,
  useMyDomainVerificationInstructions,
} from "../hooks/use-domains";
import type { DomainAppType, TenantDomain } from "../services/domains.service";

const APP_TYPE_LABELS: Record<DomainAppType, string> = {
  WEBSITE: "Website",
  IMS: "IMS",
  API: "API",
};

const VERIFY_POLL_INTERVAL_MS = 10_000;
const VERIFY_POLL_MAX_MS = 2 * 60_000;

type AppFilter = "all" | DomainAppType;

export function DomainsView() {
  const [addOpen, setAddOpen] = useState(false);
  const [newHostname, setNewHostname] = useState("");
  const [newAppType, setNewAppType] = useState<DomainAppType>("WEBSITE");
  const [filter, setFilter] = useState<AppFilter>("all");
  const [verifyTarget, setVerifyTarget] = useState<TenantDomain | null>(null);

  const domainsQuery = useMyDomains();
  const createDomain = useAddMyDomain();
  const updateDomain = useUpdateMyDomain();
  const deleteDomain = useDeleteMyDomain();
  const { toast } = useToast();

  const allDomains = useMemo(
    () => domainsQuery.data ?? [],
    [domainsQuery.data],
  );
  const visibleDomains = useMemo(
    () =>
      filter === "all"
        ? allDomains
        : allDomains.filter((d) => d.appType === filter),
    [allDomains, filter],
  );

  const handleAddDomain = async (): Promise<void> => {
    if (!newHostname.trim()) {
      toast({ title: "Enter a domain", variant: "destructive" });
      return;
    }
    try {
      await createDomain.mutateAsync({
        hostname: newHostname.trim(),
        appType: newAppType,
      });
      setNewHostname("");
      setNewAppType("WEBSITE");
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

  const handleSetPrimary = (domain: TenantDomain): void => {
    if (domain.isPrimary) return;
    updateDomain.mutate(
      { domainId: domain.id, data: { isPrimary: true } },
      {
        onSuccess: () => toast({ title: `${domain.hostname} is now primary` }),
        onError: () =>
          toast({ title: "Failed to set primary", variant: "destructive" }),
      },
    );
  };

  const handleDelete = (domain: TenantDomain): void => {
    if (!confirm(`Remove ${domain.hostname}?`)) return;
    deleteDomain.mutate(domain.id, {
      onSuccess: () => toast({ title: "Domain removed" }),
      onError: (error: Error) =>
        toast({
          title: "Failed to remove domain",
          description: error.message,
          variant: "destructive",
        }),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Domains & DNS"
        description="Custom domains, SSL, and DNS records."
        actions={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Connect domain
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add domain</DialogTitle>
                <DialogDescription>
                  Pick the app this hostname is for, then add a TXT record and
                  point an A record at the platform IP we show after creating.
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
                      if (e.key === "Enter") handleAddDomain();
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="domain-app-type">App</Label>
                  <Select
                    value={newAppType}
                    onValueChange={(v) => setNewAppType(v as DomainAppType)}
                  >
                    <SelectTrigger id="domain-app-type" aria-label="App type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEBSITE">Website (public)</SelectItem>
                      <SelectItem value="IMS">IMS (admin)</SelectItem>
                      <SelectItem value="API">API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAddOpen(false);
                      setNewHostname("");
                      setNewAppType("WEBSITE");
                    }}
                    disabled={createDomain.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddDomain}
                    disabled={createDomain.isPending}
                  >
                    {createDomain.isPending ? "Adding…" : "Add domain"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {allDomains.length > 0 && (
        <Tabs value={filter} onValueChange={(v) => setFilter(v as AppFilter)}>
          <TabsList>
            <TabsTrigger value="all">All ({allDomains.length})</TabsTrigger>
            <TabsTrigger value="WEBSITE">
              Website (
              {allDomains.filter((d) => d.appType === "WEBSITE").length})
            </TabsTrigger>
            <TabsTrigger value="IMS">
              IMS ({allDomains.filter((d) => d.appType === "IMS").length})
            </TabsTrigger>
            <TabsTrigger value="API">
              API ({allDomains.filter((d) => d.appType === "API").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {domainsQuery.isLoading && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Loading domains…
        </div>
      )}

      {!domainsQuery.isLoading && visibleDomains.length === 0 && (
        <Empty>
          <EmptyMedia variant="icon">
            <Globe className="h-6 w-6" />
          </EmptyMedia>
          <EmptyContent>
            <EmptyTitle>No custom domains</EmptyTitle>
            <EmptyDescription>
              Add a domain to point it at your site, IMS, or API.
            </EmptyDescription>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add domain
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {visibleDomains.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {visibleDomains.map((domain) => (
              <DomainRow
                key={domain.id}
                domain={domain}
                onSetPrimary={handleSetPrimary}
                onDelete={handleDelete}
                onVerify={() => setVerifyTarget(domain)}
                isUpdating={updateDomain.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {verifyTarget && (
        <VerifyDomainDialog
          domain={verifyTarget}
          onClose={() => setVerifyTarget(null)}
        />
      )}
    </div>
  );
}

interface DomainRowProps {
  domain: TenantDomain;
  onSetPrimary: (domain: TenantDomain) => void;
  onDelete: (domain: TenantDomain) => void;
  onVerify: () => void;
  isUpdating: boolean;
}

function DomainRow({
  domain,
  onSetPrimary,
  onDelete,
  onVerify,
  isUpdating,
}: DomainRowProps) {
  const isVerified = !!domain.verifiedAt;
  const isSslValid = domain.sslStatus === "valid";

  return (
    <div className="px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
      <div className="flex-1 flex items-center gap-3 min-w-0">
        <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{domain.hostname}</div>
          <div className="flex items-center gap-2 mt-1 text-xs">
            <span className="inline-flex items-center px-1.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
              {APP_TYPE_LABELS[domain.appType]}
            </span>
            {isVerified ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-3 w-3" />
                Pending DNS
              </span>
            )}
            {domain.isPrimary && (
              <span className="inline-flex items-center gap-1 px-1.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                Primary
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4">
        <div className="flex items-center gap-1 px-2 py-1 text-xs rounded-sm bg-muted">
          <Shield
            className={`h-3 w-3 ${isSslValid ? "text-emerald-600" : "text-amber-600"}`}
          />
          {isSslValid ? "SSL valid" : "SSL pending"}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isVerified && (
              <DropdownMenuItem onClick={onVerify}>Verify DNS</DropdownMenuItem>
            )}
            {isVerified && !domain.isPrimary && (
              <DropdownMenuItem
                onClick={() => onSetPrimary(domain)}
                disabled={isUpdating}
              >
                Set as primary
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => onDelete(domain)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

interface VerifyDomainDialogProps {
  domain: TenantDomain;
  onClose: () => void;
}

function VerifyDomainDialog({ domain, onClose }: VerifyDomainDialogProps) {
  const { toast } = useToast();
  const verifyMutation = useVerifyMyDomain();
  const instructionsQuery = useMyDomainVerificationInstructions(domain.id);
  const [polling, setPolling] = useState(false);
  const [pollStartedAt, setPollStartedAt] = useState<number | null>(null);

  // Poll the verify endpoint every 10s for up to 2min while DNS propagates.
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
        toast({ title: "Domain verified!" });
        onClose();
        return;
      }
      setPolling(true);
      setPollStartedAt(Date.now());
      toast({
        title: "Waiting for DNS",
        description: "We'll check every 10 seconds for the next 2 minutes.",
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
            Add the DNS records below, then click &quot;Check DNS&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3 flex gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-200">
              DNS can take up to 48 hours to propagate. Most providers update
              within minutes.
            </p>
          </div>

          {instructionsQuery.isLoading && (
            <div className="text-xs text-muted-foreground py-4 text-center">
              Loading DNS instructions…
            </div>
          )}

          {instructions && (
            <>
              <DnsRecordDisplay
                label="A record"
                name={instructions.aRecordName}
                value={instructions.aRecordValue || "(not configured)"}
                type="A"
              />
              <DnsRecordDisplay
                label="TXT record (verification)"
                name={instructions.txtName}
                value={instructions.txtValue}
                type="TXT"
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

function DnsRecordDisplay({
  label,
  name,
  value,
  type,
}: {
  label: string;
  name: string;
  value: string;
  type: string;
}) {
  const { toast } = useToast();
  const copy = (text: string): void => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied" });
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="space-y-1 text-xs font-mono bg-muted p-2 rounded border border-border">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Type:</span>
          <span>{type}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Name:</span>
          <button
            type="button"
            onClick={() => copy(name)}
            className="hover:text-foreground text-muted-foreground"
            title="Click to copy"
          >
            {name}
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Value:</span>
          <button
            type="button"
            onClick={() => copy(value)}
            className="hover:text-foreground text-muted-foreground break-all text-right"
            title="Click to copy"
          >
            {value}
          </button>
        </div>
      </div>
    </div>
  );
}
