import type React from "react";

import { cn } from "@/lib/utils";

export interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  /** `wide` for analytics-heavy layouts; default caps width for readability */
  variant?: "default" | "wide";
}

export function PageShell({
  children,
  className,
  variant = "default",
}: PageShellProps): React.ReactElement {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        variant === "wide" ? "max-w-[1600px]" : "max-w-7xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
