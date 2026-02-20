"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorScreen } from "@/components/layout/error-page";

export default function Error({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorScreen
      title="Something went wrong"
      description="An unexpected error occurred. You can try again or go back home."
      actions={
        <>
          <Button onClick={reset} className="w-full">
            Try again
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Go home</Link>
          </Button>
        </>
      }
    />
  );
}
