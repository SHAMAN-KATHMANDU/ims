"use client";

import type React from "react";
import { useResourceUsage, type LimitedResource } from "@/hooks/useUsage";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";

interface LimitGuardProps {
  resource: LimitedResource;
  children: React.ReactNode;
}

/**
 * Wraps an "Add" button and pre-checks resource usage.
 * - At limit: disables the button and shows a tooltip with limit info
 * - Near limit (>= 80%): shows a subtle usage badge
 * - Otherwise: renders children normally
 */
export function LimitGuard({ resource, children }: LimitGuardProps) {
  const { data, isLoading } = useResourceUsage(resource);

  if (isLoading || !data) {
    return <>{children}</>;
  }

  // Unlimited resources pass through
  if (data.effectiveLimit === -1) {
    return <>{children}</>;
  }

  const isAtLimit = data.isAtLimit;
  const isNearLimit = data.usagePercent >= 80 && !isAtLimit;

  if (isAtLimit) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center gap-2">
              <div className="pointer-events-none opacity-50">{children}</div>
              <Badge variant="destructive" className="gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                Limit reached
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p>
              You&apos;ve reached the maximum of {data.effectiveLimit}{" "}
              {resource} for your plan ({data.current}/{data.effectiveLimit}).
              Request an add-on or upgrade your plan.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isNearLimit) {
    return (
      <div className="inline-flex items-center gap-2">
        {children}
        <Badge
          variant="outline"
          className="text-xs text-amber-600 border-amber-300"
        >
          {data.current}/{data.effectiveLimit}
        </Badge>
      </div>
    );
  }

  return <>{children}</>;
}
