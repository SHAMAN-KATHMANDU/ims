"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ErrorScreen } from "@/components/layout/error-page";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Surface the underlying error so crashes in this workspace are diagnosable
  // (Next.js only logs a generic message otherwise).
  useEffect(() => {
    console.error("Workspace error boundary caught:", error, {
      digest: error.digest,
    });
  }, [error]);

  const pathname = usePathname();
  const segments = pathname?.split("/").filter(Boolean) ?? [];
  const workspace = segments[0];
  const homeHref = workspace ? `/${workspace}` : "/";

  return (
    <ErrorScreen
      title="Something went wrong"
      description="An unexpected error occurred in this workspace."
      actions={
        <>
          <Button onClick={reset} className="w-full">
            Try again
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={homeHref}>Go home</Link>
          </Button>
        </>
      }
    />
  );
}
