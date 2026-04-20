"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ReviewsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[reviews] route error", error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-3 p-6">
      <h1 className="text-2xl font-semibold">Reviews</h1>
      <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
        <p className="font-medium text-destructive">
          Couldn&apos;t load the reviews page.
        </p>
        <p className="text-muted-foreground">
          {error.message || "An unexpected error occurred."}
        </p>
      </div>
      <Button type="button" variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
