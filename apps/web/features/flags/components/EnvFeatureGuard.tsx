"use client";

import type { ReactNode } from "react";
import { EnvFeature } from "@repo/shared";
import { useEnvFeatureFlag } from "../use-feature-flag";

export interface EnvFeatureGuardProps {
  envFeature: EnvFeature;
  children: ReactNode;
  /** When env feature is disabled, render this instead of children. */
  fallback?: ReactNode;
}

/**
 * Renders children only when the env feature is enabled for the current environment.
 * Otherwise renders fallback or null.
 */
export function EnvFeatureGuard({
  envFeature,
  children,
  fallback = null,
}: EnvFeatureGuardProps) {
  const enabled = useEnvFeatureFlag(envFeature);

  if (enabled) return <>{children}</>;
  return <>{fallback}</>;
}
