"use client";

import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { EnvFeature } from "@repo/shared";
import { useEnvFeatureFlag } from "../use-feature-flag";

export interface EnvFeaturePageGuardProps {
  envFeature: EnvFeature;
  children: ReactNode;
}

/**
 * For env-gated pages: renders children only when the env feature is enabled.
 * Otherwise calls notFound(). Use in app/[workspace]/.../page.tsx for env-only or with FeaturePageGuard for env+plan.
 */
export function EnvFeaturePageGuard({
  envFeature,
  children,
}: EnvFeaturePageGuardProps) {
  const enabled = useEnvFeatureFlag(envFeature);

  if (!enabled) notFound();
  return <>{children}</>;
}
