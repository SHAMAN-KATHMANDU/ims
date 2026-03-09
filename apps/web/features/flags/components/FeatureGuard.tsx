"use client";

import type { ReactNode } from "react";
import { Feature, FEATURE_REGISTRY } from "@repo/shared";
import { useFeatureFlag } from "../use-feature-flag";

export interface FeatureGuardProps {
  feature: Feature;
  children: ReactNode;
  /** When feature is disabled, render this instead of children. If not set, renders null. */
  fallback?: ReactNode;
}

/**
 * Renders children only when the current plan allows the given feature.
 * Otherwise renders fallback or null. Use for plan-gated UI (links, sections, pages).
 */
export function FeatureGuard({
  feature,
  children,
  fallback = null,
}: FeatureGuardProps) {
  const enabled = useFeatureFlag(feature);

  if (enabled) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  const def = FEATURE_REGISTRY[feature];
  if (def?.upgradeMessage) {
    return (
      <span
        className="text-sm text-muted-foreground"
        title={def.upgradeMessage}
      >
        {def.upgradeMessage}
      </span>
    );
  }

  return null;
}
