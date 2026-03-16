/**
 * Enforce Environment Feature Middleware
 *
 * Returns 404 when the given env feature flag is disabled for the current
 * deployment (APP_ENV + FEATURE_FLAGS). Must run after auth.
 *
 * Usage: Apply to routes that are gated by env, e.g. enforceEnvFeature(EnvFeature.CRM_DEALS)
 */

import { Request, Response, NextFunction } from "express";
import {
  type EnvFeature,
  isEnvFeatureEnabled,
  parseFeatureFlagsEnv,
} from "@repo/shared";
import { env } from "@/config/env";

export function enforceEnvFeature(flag: EnvFeature) {
  return (req: Request, res: Response, next: NextFunction) => {
    const enabledSet = parseFeatureFlagsEnv(env.featureFlags);
    const enabled = isEnvFeatureEnabled(flag, env.appEnv, enabledSet);

    if (!enabled) {
      return res.status(404).json({
        error: "feature_not_available",
        message: "This feature is not available in this environment.",
        feature: flag,
      });
    }

    next();
  };
}
