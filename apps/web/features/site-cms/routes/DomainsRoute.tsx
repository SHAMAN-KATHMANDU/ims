"use client";

import type { JSX } from "react";
import { useState } from "react";
import { useSetBreadcrumbs } from "../hooks/use-breadcrumbs";
import {
  useMyDomains,
  useMyDomainVerificationInstructions,
  useVerifyMyDomain,
  type TenantDomain,
} from "@/features/sites";
import { Btn, Card, StatusPill, Pill } from "../components/ui";
import {
  Plus,
  Globe,
  Shield,
  MoreHorizontal,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { AddDomainDialog } from "../../sites/components/AddDomainDialog";

export function DomainsRoute(): JSX.Element {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [copiedTxt, setCopiedTxt] = useState<string | null>(null);

  const { data: domains, isLoading: domainsLoading } = useMyDomains("WEBSITE");
  const { data: verifyInstructions } =
    useMyDomainVerificationInstructions(selectedDomainId);
  const verifyMutation = useVerifyMyDomain();
  const { toast } = useToast();

  const domainsList = domains ?? [];

  // Default to first unverified domain, then first domain
  const defaultDomain =
    domainsList.find((d: TenantDomain) => !d.verifiedAt) || domainsList[0];

  const activeDomain = selectedDomainId
    ? domainsList.find((d: TenantDomain) => d.id === selectedDomainId)
    : defaultDomain;

  if (activeDomain && selectedDomainId !== activeDomain.id) {
    setSelectedDomainId(activeDomain.id);
  }

  const handleVerify = async () => {
    if (!activeDomain) return;
    try {
      await verifyMutation.mutateAsync(activeDomain.id);
      toast({ title: "Domain verified successfully" });
    } catch (error) {
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const handleCopyTxt = () => {
    if (!verifyInstructions?.txtValue) return;
    navigator.clipboard.writeText(verifyInstructions.txtValue);
    setCopiedTxt(verifyInstructions.txtValue);
    setTimeout(() => setCopiedTxt(null), 2000);
  };

  const handleCopyARecord = () => {
    if (!verifyInstructions?.aRecordValue) return;
    navigator.clipboard.writeText(verifyInstructions.aRecordValue);
    setCopiedTxt(verifyInstructions.aRecordValue);
    setTimeout(() => setCopiedTxt(null), 2000);
  };

  useSetBreadcrumbs(["Site", "Domains"], {
    subline: "Custom domains and DNS records.",
    right: (
      <div style={{ display: "flex", gap: 8 }}>
        <Btn variant="primary" icon={Plus} onClick={() => setDialogOpen(true)}>
          Connect domain
        </Btn>
      </div>
    ),
  });

  return (
    <>
      <div style={{ padding: "20px 24px 64px", maxWidth: 1180 }}>
        {/* Domains List Card */}
        <Card style={{ padding: 0, marginBottom: 16 }}>
          {domainsLoading ? (
            <div style={{ padding: "16px", color: "var(--ink-3)" }}>
              Loading domains…
            </div>
          ) : domainsList.length === 0 ? (
            <div style={{ padding: "16px", color: "var(--ink-3)" }}>
              No domains connected yet.{" "}
              <button
                onClick={() => setDialogOpen(true)}
                style={{
                  color: "var(--accent)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Add one
              </button>
              .
            </div>
          ) : (
            domainsList.map((domain: TenantDomain, idx: number) => (
              <div
                key={domain.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 110px 110px 32px",
                  padding: "14px 16px",
                  alignItems: "center",
                  borderBottom:
                    idx < domainsList.length - 1
                      ? "1px solid var(--line-2)"
                      : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Globe size={14} style={{ color: "var(--ink-4)" }} />
                  <span
                    className="mono"
                    style={{ fontSize: 13, fontWeight: 500 }}
                  >
                    {domain.hostname}
                  </span>
                  {domain.isPrimary && <Pill tone="accent">Primary</Pill>}
                </div>
                <StatusPill
                  status={
                    domain.verifiedAt
                      ? "connected"
                      : domain.tlsStatus === "FAILED"
                        ? "pending"
                        : domain.tlsStatus === "PENDING"
                          ? "verifying"
                          : "pending"
                  }
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 12,
                  }}
                >
                  <Shield
                    size={11}
                    style={{
                      color:
                        domain.tlsStatus === "ACTIVE"
                          ? "var(--success)"
                          : domain.tlsStatus === "FAILED"
                            ? "var(--warn)"
                            : "var(--ink-4)",
                    }}
                  />
                  <span style={{ color: "var(--ink-3)" }}>
                    {domain.tlsStatus}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDomainId(domain.id)}
                  style={{
                    width: 22,
                    height: 22,
                    color: "var(--ink-4)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  aria-label={`View details for ${domain.hostname}`}
                >
                  <MoreHorizontal size={13} />
                </button>
              </div>
            ))
          )}
        </Card>

        {/* DNS Records & Verification Card */}
        {activeDomain && verifyInstructions && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr",
              gap: 14,
            }}
          >
            {/* DNS Records Card */}
            <Card>
              <div
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid var(--line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                    DNS records
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 11, color: "var(--ink-4)" }}
                  >
                    {activeDomain.hostname}
                  </div>
                </div>
              </div>

              {/* DNS Records Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "60px 1.2fr 2fr 70px 32px",
                  padding: "8px 14px",
                  background: "var(--bg-sunken)",
                  fontSize: 10.5,
                  color: "var(--ink-4)",
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span>Type</span>
                <span>Name</span>
                <span>Value</span>
                <span>TTL</span>
                <span />
              </div>

              {/* A Record */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "60px 1.2fr 2fr 70px 32px",
                  padding: "10px 14px",
                  borderTop: "1px solid var(--line-2)",
                  alignItems: "center",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span
                  style={{
                    fontSize: 10.5,
                    padding: "1px 6px",
                    borderRadius: 3,
                    background: "var(--bg-sunken)",
                    border: "1px solid var(--line)",
                    width: "fit-content",
                    color: "var(--ink-2)",
                  }}
                >
                  A
                </span>
                <span>{verifyInstructions.aRecordName || "@"}</span>
                <span style={{ color: "var(--ink-3)" }}>
                  {verifyInstructions.aRecordValue || "(not configured)"}
                </span>
                <span style={{ color: "var(--ink-4)" }}>Auto</span>
                <button
                  onClick={handleCopyARecord}
                  disabled={!verifyInstructions.aRecordValue}
                  style={{
                    width: 22,
                    height: 22,
                    color: "var(--ink-4)",
                    background: "transparent",
                    border: "none",
                    cursor: verifyInstructions.aRecordValue
                      ? "pointer"
                      : "default",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  aria-label="Copy A record value"
                >
                  {copiedTxt === verifyInstructions.aRecordValue ? (
                    <Check size={13} />
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
              </div>

              {/* TXT Record */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "60px 1.2fr 2fr 70px 32px",
                  padding: "10px 14px",
                  borderTop: "1px solid var(--line-2)",
                  alignItems: "center",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span
                  style={{
                    fontSize: 10.5,
                    padding: "1px 6px",
                    borderRadius: 3,
                    background: "var(--bg-sunken)",
                    border: "1px solid var(--line)",
                    width: "fit-content",
                    color: "var(--ink-2)",
                  }}
                >
                  TXT
                </span>
                <span>{verifyInstructions.txtName}</span>
                <span
                  style={{
                    color: "var(--ink-3)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={verifyInstructions.txtValue}
                >
                  {verifyInstructions.txtValue}
                </span>
                <span style={{ color: "var(--ink-4)" }}>Auto</span>
                <button
                  onClick={handleCopyTxt}
                  style={{
                    width: 22,
                    height: 22,
                    color: "var(--ink-4)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  aria-label="Copy TXT record value"
                >
                  {copiedTxt === verifyInstructions.txtValue ? (
                    <Check size={13} />
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
              </div>
            </Card>

            {/* Verification Status Card */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Card padded>
                <div
                  className="mono"
                  style={{
                    fontSize: 10.5,
                    color: "var(--ink-4)",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 10,
                  }}
                >
                  Verification
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 6,
                      background: activeDomain.verifiedAt
                        ? "oklch(from var(--success) l c h / 0.12)"
                        : "oklch(from var(--warn) l c h / 0.12)",
                      color: activeDomain.verifiedAt
                        ? "var(--success)"
                        : "var(--warn)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Shield size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                      {activeDomain.verifiedAt
                        ? "Verified"
                        : "Awaiting DNS verification"}
                    </div>
                    <div
                      className="mono"
                      style={{ fontSize: 11.5, color: "var(--ink-4)" }}
                    >
                      {activeDomain.verifiedAt
                        ? `Verified on ${new Date(activeDomain.verifiedAt).toLocaleDateString()}`
                        : "Add DNS records and verify"}
                    </div>
                  </div>
                </div>
                {!activeDomain.verifiedAt && (
                  <Btn
                    variant="primary"
                    size="sm"
                    icon={RefreshCw}
                    onClick={handleVerify}
                    disabled={verifyMutation.isPending}
                  >
                    {verifyMutation.isPending ? "Verifying…" : "Verify"}
                  </Btn>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>

      <AddDomainDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
