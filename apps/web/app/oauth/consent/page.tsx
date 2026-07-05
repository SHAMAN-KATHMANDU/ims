"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth, SlugEntryForm } from "@/features/auth";
import { ConsentCard } from "@/features/oauth";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

/**
 * OAuth consent for MCP clients. Root-level (outside /[workspace]) because the
 * tenant is unknown until the user logs in: the API's /authorize endpoint
 * redirects here with ?request_id=, and approval binds the grant to whichever
 * tenant the user authenticates into.
 */
function ConsentPageInner() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get("request_id");
  const { isAuthenticated, isHydrated } = useAuth();

  if (!requestId) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Invalid authorization link</CardTitle>
          <CardDescription>
            This page is opened by an MCP client during connection setup. Go
            back to your client and start the connection again.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!isHydrated) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading…
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Sign in to continue</CardTitle>
          <CardDescription>
            An MCP client is requesting access to your workspace. Enter your
            organization to sign in — you&apos;ll come back here to approve or
            deny the request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SlugEntryForm
            next={`/oauth/consent?request_id=${encodeURIComponent(requestId)}`}
          />
        </CardContent>
      </Card>
    );
  }

  return <ConsentCard requestId={requestId} />;
}

export default function OAuthConsentPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/20">
      <ThemeToggle className="absolute right-4 top-4" />
      <Suspense fallback={null}>
        <ConsentPageInner />
      </Suspense>
    </div>
  );
}
