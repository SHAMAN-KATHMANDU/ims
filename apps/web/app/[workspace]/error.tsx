"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ErrorScreen } from "@/components/layout/error-page";

export default function WorkspaceError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
