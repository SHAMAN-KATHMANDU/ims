"use client";

import { useMemo, useState } from "react";
import { Plus, Key, RefreshCw, Trash2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useEnvFeatureFlag, EnvFeature } from "@/features/flags";
import { useMyDomains, type TenantDomain } from "@/features/sites";
import {
  usePublicApiKeys,
  useRotatePublicApiKey,
  useRevokePublicApiKey,
} from "../hooks/use-public-api-keys";
import { IssuePublicApiKeyDialog } from "./IssuePublicApiKeyDialog";
import type { PublicApiKey } from "../types";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function statusLabel(key: PublicApiKey): { label: string; tone: string } {
  if (key.revokedAt) {
    return { label: "Revoked", tone: "text-destructive" };
  }
  return { label: "Active", tone: "text-emerald-500" };
}

/**
 * Public API Keys section — surfaces tenant-issued, domain-bound read-only
 * keys for the /public/v1/* surface. Renders inline within the existing
 * domain panel of the Site Management UI.
 *
 * Hidden entirely when EnvFeature.PUBLIC_DATA_API is off.
 */
export function PublicApiKeysSection() {
  const featureEnabled = useEnvFeatureFlag(EnvFeature.PUBLIC_DATA_API);
  const domainsQuery = useMyDomains();
  const keysQuery = usePublicApiKeys({ enabled: featureEnabled });
  const rotate = useRotatePublicApiKey();
  const revoke = useRevokePublicApiKey();
  const { toast } = useToast();

  const [issueOpen, setIssueOpen] = useState(false);
  const [rotated, setRotated] = useState<{ keyString: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const verifiedDomains = useMemo(() => {
    return (domainsQuery.data ?? [])
      .filter((d: TenantDomain) => d.verifiedAt)
      .map((d: TenantDomain) => ({ id: d.id, hostname: d.hostname }));
  }, [domainsQuery.data]);

  if (!featureEnabled) return null;

  const handleRotate = (key: PublicApiKey) => {
    rotate.mutate(key.id, {
      onSuccess: (data) => {
        setRotated({ keyString: data.key });
        toast({ title: "API key rotated" });
      },
      onError: (error) =>
        toast({
          title: "Rotate failed",
          description:
            error instanceof Error ? error.message : "Please try again",
          variant: "destructive",
        }),
    });
  };

  const handleRevoke = (key: PublicApiKey) => {
    if (!window.confirm(`Revoke "${key.name}"? This cannot be undone.`)) return;
    revoke.mutate(key.id, {
      onSuccess: () => toast({ title: "API key revoked" }),
      onError: (error) =>
        toast({
          title: "Revoke failed",
          description:
            error instanceof Error ? error.message : "Please try again",
          variant: "destructive",
        }),
    });
  };

  const handleCopyRotated = async () => {
    if (!rotated) return;
    try {
      await navigator.clipboard.writeText(rotated.keyString);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const keys = keysQuery.data ?? [];

  return (
    <div className="flex flex-col">
      <div className="h-11 px-3 flex items-center border-b border-border shrink-0">
        <span className="text-[13px] font-semibold text-foreground flex-1">
          Public API keys
        </span>
        <button
          onClick={() => setIssueOpen(true)}
          disabled={verifiedDomains.length === 0}
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted disabled:opacity-40"
          aria-label="Issue API key"
          title={
            verifiedDomains.length === 0
              ? "Verify a domain first"
              : "Issue API key"
          }
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="p-3 space-y-2">
        {keysQuery.isLoading && (
          <div className="text-center py-6 text-[12px] text-muted-foreground/60">
            Loading…
          </div>
        )}

        {!keysQuery.isLoading && keys.length === 0 && (
          <div className="text-center py-6 px-3 text-[12px] text-muted-foreground/80">
            <div className="relative mx-auto mb-3 h-12 w-12">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 to-transparent blur-md" />
              <div className="relative h-12 w-12 rounded-xl bg-muted border border-border grid place-items-center">
                <Key size={20} className="text-muted-foreground/60" />
              </div>
            </div>
            <div className="text-[12.5px] font-medium text-foreground/80 mb-0.5">
              No API keys yet
            </div>
            <div className="text-[11px] text-muted-foreground/60">
              Issue a key to read your data from a custom frontend.
            </div>
          </div>
        )}

        {keys.map((key) => {
          const status = statusLabel(key);
          const isRevoked = !!key.revokedAt;
          return (
            <div
              key={key.id}
              className="p-3 rounded-md border border-border bg-card text-[12px] flex items-start gap-2"
            >
              <Key
                size={13}
                className="shrink-0 text-muted-foreground mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate flex items-center gap-2">
                  {key.name}
                  <span className={`text-[10px] font-normal ${status.tone}`}>
                    {status.label}
                  </span>
                </div>
                <div className="text-muted-foreground/70 mt-0.5 font-mono text-[11px]">
                  {key.prefix}…{key.last4}
                </div>
                <div className="text-muted-foreground/60 mt-0.5 text-[11px]">
                  Domain:{" "}
                  <span className="text-foreground/80">
                    {key.allowedDomain.hostname}
                  </span>
                  {" · "}
                  Limit: {key.rateLimitPerMin}/min
                </div>
                <div className="text-muted-foreground/50 mt-0.5 text-[10px]">
                  Created {formatDate(key.createdAt)}
                  {key.lastUsedAt
                    ? ` · Last used ${formatDate(key.lastUsedAt)}`
                    : " · Never used"}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {!isRevoked && (
                  <button
                    onClick={() => handleRotate(key)}
                    disabled={rotate.isPending}
                    className="h-6 px-2 rounded text-[11px] border border-border hover:bg-muted text-muted-foreground transition-colors disabled:opacity-40 flex items-center gap-1"
                    title="Rotate key"
                  >
                    <RefreshCw size={11} />
                    Rotate
                  </button>
                )}
                {!isRevoked && (
                  <button
                    onClick={() => handleRevoke(key)}
                    disabled={revoke.isPending}
                    className="h-6 w-6 grid place-items-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                    aria-label="Revoke key"
                    title="Revoke"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <IssuePublicApiKeyDialog
        verifiedDomains={verifiedDomains}
        open={issueOpen}
        onOpenChange={setIssueOpen}
      />

      {/* Rotated-key reveal — same one-time-display contract as issuance */}
      {rotated && (
        <div className="p-3 border-t border-border">
          <div className="rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs">
            <div className="font-medium text-amber-900 dark:text-amber-200 mb-2">
              New key — copy now, won&apos;t be shown again
            </div>
            <div className="flex items-stretch gap-2">
              <code className="flex-1 rounded border border-border bg-card px-2 py-1 font-mono break-all">
                {rotated.keyString}
              </code>
              <button
                onClick={handleCopyRotated}
                className="h-7 w-7 grid place-items-center rounded border border-border hover:bg-muted"
                aria-label="Copy rotated key"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
              <button
                onClick={() => setRotated(null)}
                className="h-7 px-2 rounded border border-border hover:bg-muted text-[11px]"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
