"use client";

import { useState } from "react";
import {
  Plus,
  Globe,
  CheckCircle2,
  Clock,
  Trash2,
  AlertCircle,
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
  type TenantDomain,
} from "@/features/sites";

export function DomainPanel() {
  const [addOpen, setAddOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<TenantDomain | null>(null);
  const [newHostname, setNewHostname] = useState("");
  const domainsQuery = useMyDomains();
  const createDomain = useAddMyDomain();
  const deleteDomain = useDeleteMyDomain();
  const verifyDomain = useVerifyMyDomain();
  const { toast } = useToast();

  const handleCreateDomain = async () => {
    if (!newHostname.trim()) {
      toast({
        title: "Enter a domain",
        variant: "destructive",
      });
      return;
    }
    try {
      await createDomain.mutateAsync({
        hostname: newHostname.trim(),
        appType: "WEBSITE",
      });
      setNewHostname("");
      setAddOpen(false);
      toast({ title: "Domain added" });
    } catch (error) {
      toast({
        title: "Failed to add domain",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (domain: TenantDomain) => {
    deleteDomain.mutate(domain.id, {
      onSuccess: () => toast({ title: "Domain removed" }),
      onError: () =>
        toast({ title: "Failed to remove domain", variant: "destructive" }),
    });
  };

  const handleVerify = async (domain: TenantDomain) => {
    try {
      await verifyDomain.mutateAsync(domain.id);
      setVerifyTarget(null);
      toast({ title: "Domain verified" });
    } catch (error) {
      toast({
        title: "Verification failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="h-11 px-4 flex items-center border-b border-border shrink-0">
        <span className="text-sm font-semibold text-foreground flex-1">
          Domains
        </span>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.preventDefault();
                setAddOpen(true);
              }}
            >
              <Plus size={14} />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add domain</DialogTitle>
              <DialogDescription>
                Enter your domain name. You&apos;ll verify DNS ownership next.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="domain-input">Domain</Label>
                <Input
                  id="domain-input"
                  placeholder="example.com"
                  value={newHostname}
                  onChange={(e) => setNewHostname(e.target.value)}
                  disabled={createDomain.isPending}
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

        {!domainsQuery.isLoading && (domainsQuery.data?.length ?? 0) === 0 && (
          <div className="text-center py-8 rounded-lg border border-dashed border-border bg-muted/30">
            <Globe className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
            <div className="text-sm font-medium text-foreground/80">
              No custom domains
            </div>
            <div className="text-xs text-muted-foreground">
              Add one to point a domain at your site.
            </div>
          </div>
        )}

        {domainsQuery.data?.map((domain) => (
          <DomainCard
            key={domain.id}
            domain={domain}
            onDelete={handleDelete}
            onVerify={handleVerify}
            isPending={verifyDomain.isPending}
            verifyTarget={verifyTarget}
            setVerifyTarget={setVerifyTarget}
          />
        ))}
      </div>
    </div>
  );
}

function DomainCard({
  domain,
  onDelete,
  onVerify,
  isPending,
  verifyTarget,
  setVerifyTarget,
}: {
  domain: TenantDomain;
  onDelete: (domain: TenantDomain) => void;
  onVerify: (domain: TenantDomain) => Promise<void>;
  isPending: boolean;
  verifyTarget: TenantDomain | null;
  setVerifyTarget: (domain: TenantDomain | null) => void;
}) {
  const isVerified = Boolean(domain.verifiedAt);

  return (
    <div className="p-3 rounded-md border border-border bg-card space-y-2">
      <div className="flex items-start gap-2">
        <Globe size={14} className="shrink-0 text-muted-foreground mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground truncate text-sm">
            {domain.hostname}
          </div>
          <div className="text-xs text-muted-foreground/60 flex items-center gap-1 mt-1">
            {isVerified ? (
              <>
                <CheckCircle2 size={10} className="text-emerald-500" />
                <span>Verified</span>
              </>
            ) : (
              <>
                <Clock size={10} className="text-amber-500" />
                <span>Pending DNS</span>
              </>
            )}
            {domain.isPrimary && (
              <span className="ml-1 px-1.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                Primary
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5 pt-2">
        {!isVerified && (
          <Dialog
            open={verifyTarget?.id === domain.id}
            onOpenChange={(open) => {
              if (open) setVerifyTarget(domain);
              else setVerifyTarget(null);
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => setVerifyTarget(domain)}
              >
                Verify DNS
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Verify domain</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3 flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Add a DNS CNAME record pointing to your site. This may take
                    up to 48 hours to propagate.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Add this CNAME record:</Label>
                  <div className="bg-muted p-2 rounded text-xs font-mono border border-border">
                    <div>
                      <strong>Name:</strong> {domain.hostname}
                    </div>
                    <div>
                      <strong>Type:</strong> CNAME
                    </div>
                    <div>
                      <strong>Value:</strong> sites.example.com
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVerifyTarget(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onVerify(domain)}
                    disabled={isPending}
                  >
                    {isPending ? "Checking…" : "Check DNS"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="text-xs h-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(domain)}
        >
          <Trash2 size={12} />
          Delete
        </Button>
      </div>
    </div>
  );
}
