"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function CrmError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center min-h-[40vh] px-4 text-center"
    >
      <AlertCircle
        className="mb-4 h-12 w-12 text-destructive"
        aria-hidden="true"
      />
      <h1 className="mb-2 text-2xl font-semibold">Something went wrong</h1>
      <p className="mb-6 max-w-md text-muted-foreground">
        We couldn&apos;t load this CRM page. Please try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
