"use client";

import { useMemo } from "react";
import {
  Feature,
  type PlanTier,
  isFeatureAvailable,
  type EnvFeature,
  isEnvFeatureEnabled,
  parseFeatureFlagsEnv,
} from "@repo/shared";
import {
  useAuthStore,
  selectUserRole,
  selectPlanTier,
} from "@/store/auth-store";
import { getAppEnv, featureFlagsEnv } from "@/config/env";

/**
 * Plan-gated feature flag evaluation.
 * Uses tenant plan from auth store and shared FEATURE_REGISTRY.
 * Platform admins bypass plan checks (all features enabled).
 */
export function useFeatureFlag(feature: Feature): boolean {
  const userRole = useAuthStore(selectUserRole);
  const plan = useAuthStore(selectPlanTier);

  return useMemo(() => {
    if (userRole === "platformAdmin") return true;
    if (!plan) return false;
    return isFeatureAvailable(feature, plan as PlanTier);
  }, [feature, userRole, plan]);
}

const ALL_FEATURES = Object.values(Feature) as Feature[];

/**
 * Returns a map of all plan-gated features to whether they are enabled for the current tenant.
 * Use in navigation or when gating multiple features without calling useFeatureFlag per feature.
 */
export function usePlanFeatures(): Record<Feature, boolean> {
  const userRole = useAuthStore(selectUserRole);
  const plan = useAuthStore(selectPlanTier);

  return useMemo(() => {
    const result = {} as Record<Feature, boolean>;
    const allEnabled = userRole === "platformAdmin";
    // When plan is null (e.g. before hydrate), be conservative: hide gated features.
    // Platform admins bypass plan checks.
    for (const f of ALL_FEATURES) {
      result[f] =
        allEnabled || (plan != null && isFeatureAvailable(f, plan as PlanTier));
    }
    return result;
  }, [userRole, plan]);
}

/** Parsed FEATURE_FLAGS set (comma-separated enabled flags). Cached at module load. */
const enabledEnvFlagsSet =
  typeof featureFlagsEnv !== "undefined"
    ? parseFeatureFlagsEnv(featureFlagsEnv)
    : undefined;

/**
 * Env-based feature flag. Uses getAppEnv() and ENV_FEATURE_MATRIX (or NEXT_PUBLIC_FEATURE_FLAGS if set).
 */
export function useEnvFeatureFlag(flag: EnvFeature): boolean {
  return useMemo(
    () => isEnvFeatureEnabled(flag, getAppEnv(), enabledEnvFlagsSet),
    [flag],
  );
}
