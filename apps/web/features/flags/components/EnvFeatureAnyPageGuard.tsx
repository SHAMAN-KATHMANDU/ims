"use client";

import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import {
  EnvFeature,
  isEnvFeatureEnabled,
  parseFeatureFlagsEnv,
} from "@repo/shared";
import { getAppEnv, featureFlagsEnv } from "@/config/env";

const enabledEnvFlagsSet =
  typeof featureFlagsEnv !== "undefined"
    ? parseFeatureFlagsEnv(featureFlagsEnv)
    : undefined;

export interface EnvFeatureAnyPageGuardProps {
  envFeatures: EnvFeature[];
  children: ReactNode;
}

/**
 * Renders children when at least one of the supplied env features is enabled.
 * Calls notFound() when none are enabled.
 */
export function EnvFeatureAnyPageGuard({
  envFeatures,
  children,
}: EnvFeatureAnyPageGuardProps) {
  const anyEnabled = envFeatures.some((f) =>
    isEnvFeatureEnabled(f, getAppEnv(), enabledEnvFlagsSet),
  );

  if (!anyEnabled) notFound();
  return <>{children}</>;
}
