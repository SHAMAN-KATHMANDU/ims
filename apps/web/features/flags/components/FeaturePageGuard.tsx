"use client";

import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import type { Feature } from "@repo/shared";
import { useFeatureFlag } from "../use-feature-flag";

export interface FeaturePageGuardProps {
  feature: Feature;
  children: ReactNode;
}

/**
 * For plan-gated pages: renders children only when the feature is enabled for the current plan.
 * Otherwise calls notFound() so the route behaves as if it does not exist.
 * Use in app/[workspace]/.../page.tsx for bulk upload, deals, analytics, promos, audit logs.
 */
export function FeaturePageGuard({ feature, children }: FeaturePageGuardProps) {
  const enabled = useFeatureFlag(feature);

  if (!enabled) notFound();
  return <>{children}</>;
}
