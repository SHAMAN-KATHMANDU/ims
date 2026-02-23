"use client";

import type React from "react";
import { cn } from "@/lib/utils";

export function ResponsivePage({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("mx-auto w-full max-w-[1600px] min-w-0", className)}>
      {children}
    </section>
  );
}

export function ResponsiveActionBar({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 mt-4 border-t bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/75",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ResponsiveFieldRow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>
      {children}
    </div>
  );
}
