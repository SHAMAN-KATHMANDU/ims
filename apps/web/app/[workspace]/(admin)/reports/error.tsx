"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function ReportsError({
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
      <h1 className="mb-2 text-2xl font-semibold">Report failed to load</h1>
      <p className="mb-6 max-w-md text-muted-foreground">
        We couldn&apos;t generate this report. Try again, or narrow the date
        range if the dataset is large.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
