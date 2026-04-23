"use client";

import { useState } from "react";
import { Plus, Globe, CheckCircle2, Clock, Link2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { AddDomainDialog } from "../../sites/components/AddDomainDialog";
import { VerifyDomainDialog } from "../../sites/components/VerifyDomainDialog";
import {
  useTenantDomains,
  useDeleteTenantDomain,
  type TenantDomain,
} from "../../sites/hooks/use-tenant-domains";

export function DomainPanel({ tenantId }: { tenantId: string | null }) {
  const [addOpen, setAddOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<TenantDomain | null>(null);
  const domainsQuery = useTenantDomains(tenantId);
  const deleteDomain = useDeleteTenantDomain();
  const { toast } = useToast();

  const handleDelete = (domain: TenantDomain) => {
    deleteDomain.mutate(domain.id, {
      onSuccess: () => toast({ title: "Domain removed" }),
      onError: () =>
        toast({ title: "Failed to remove domain", variant: "destructive" }),
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-border shrink-0">
        <span className="text-[13px] font-semibold text-foreground flex-1">
          Domains
        </span>
        <button
          onClick={() => setAddOpen(true)}
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted"
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {domainsQuery.isLoading && (
          <div className="text-center py-8 text-[12px] text-muted-foreground/60">
            Loading…
          </div>
        )}
        {domainsQuery.data?.map((domain) => (
          <div
            key={domain.id}
            className="p-3 rounded-md border border-border bg-card text-[12px] flex items-start gap-2"
          >
            <Globe
              size={13}
              className="shrink-0 text-muted-foreground mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground truncate">
                {domain.hostname}
              </div>
              <div className="text-muted-foreground/60 flex items-center gap-1 mt-0.5">
                {domain.verifiedAt ? (
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
                  <span className="ml-1 px-1 rounded bg-primary/10 text-primary text-[10px] font-medium">
                    Primary
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              {!domain.verifiedAt && (
                <button
                  onClick={() => setVerifyTarget(domain)}
                  className="h-6 px-2 rounded text-[11px] border border-border hover:bg-muted text-muted-foreground transition-colors"
                >
                  Verify
                </button>
              )}
              <button
                onClick={() => handleDelete(domain)}
                disabled={deleteDomain.isPending}
                className={cn(
                  "h-6 w-6 grid place-items-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40",
                )}
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
        {!domainsQuery.isLoading && (domainsQuery.data?.length ?? 0) === 0 && (
          <div className="text-center py-8 px-3 text-[12px] text-muted-foreground/80">
            <div className="relative mx-auto mb-3 h-12 w-12">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 to-transparent blur-md" />
              <div className="relative h-12 w-12 rounded-xl bg-muted border border-border grid place-items-center">
                <Link2 size={20} className="text-muted-foreground/60" />
              </div>
            </div>
            <div className="text-[12.5px] font-medium text-foreground/80 mb-0.5">
              No custom domains
            </div>
            <div className="text-[11px] text-muted-foreground/60">
              Add one to point a domain at your site.
            </div>
          </div>
        )}
        <button
          onClick={() => setAddOpen(true)}
          className="w-full h-8 rounded-md border border-dashed border-border text-[12px] text-muted-foreground hover:bg-muted/50 flex items-center justify-center gap-1.5 transition-colors"
        >
          <Plus size={12} />
          Add domain
        </button>
      </div>
      {tenantId && (
        <AddDomainDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          tenantId={tenantId}
        />
      )}
      <VerifyDomainDialog
        open={!!verifyTarget}
        onOpenChange={(o) => !o && setVerifyTarget(null)}
        domain={verifyTarget}
      />
    </div>
  );
}
