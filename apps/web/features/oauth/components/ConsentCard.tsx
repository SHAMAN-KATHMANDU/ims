"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldCheck, Loader2 } from "lucide-react";
import {
  useConsentDetails,
  useConsentDecision,
} from "../hooks/use-oauth-consent";

/**
 * Approve/deny card for an MCP OAuth authorization request. On decision the
 * API returns the client's redirect URI (with ?code= or ?error=) and the
 * browser navigates there, handing control back to the MCP client.
 */
export function ConsentCard({ requestId }: { requestId: string }) {
  const { user, tenant } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const details = useConsentDetails(requestId);
  const decision = useConsentDecision(requestId);

  const decide = async (approved: boolean) => {
    setDecisionError(null);
    try {
      const { redirectTo } = await decision.mutateAsync(approved);
      setRedirecting(true);
      window.location.assign(redirectTo);
    } catch (error) {
      setDecisionError(getApiErrorMessage(error));
    }
  };

  if (details.isLoading) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading authorization request…
        </CardContent>
      </Card>
    );
  }

  if (details.isError || !details.data) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Authorization request unavailable</CardTitle>
          <CardDescription>{getApiErrorMessage(details.error)}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The request may have expired or already been handled. Go back to your
          MCP client and start the connection again.
        </CardContent>
      </Card>
    );
  }

  const busy = decision.isPending || redirecting;

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck
            className="h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
          <CardTitle className="text-xl">Authorize access</CardTitle>
        </div>
        <CardDescription>
          <span className="font-medium text-foreground">
            {details.data.clientName}
          </span>{" "}
          ({details.data.redirectHost}) is requesting access to your MCP tools.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="rounded-md border bg-muted/30 p-3 space-y-1">
          <p>
            <span className="text-muted-foreground">Workspace:</span>{" "}
            {tenant?.name ?? tenant?.slug ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Acting as:</span>{" "}
            {user?.username ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Scope:</span>{" "}
            {details.data.scope} — the client can use the MCP tools your role
            already permits, nothing more.
          </p>
        </div>
        {decisionError && (
          <div
            role="alert"
            className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20"
          >
            {decisionError}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          disabled={busy}
          onClick={() => decide(false)}
        >
          Deny
        </Button>
        <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
          {busy ? "Redirecting…" : "Approve"}
        </Button>
      </CardFooter>
    </Card>
  );
}
