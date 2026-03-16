/**
 * Build-time env and feature flags. Single source of truth.
 * Do NOT add environment checks in components or stores.
 *
 * Missing required vars in staging/production will throw at build/load.
 */

import type { AppEnv } from "@repo/shared";

const NODE_ENV = process.env.NODE_ENV ?? "development";
export const isDev = NODE_ENV === "development";
export const isStaging =
  (process.env.NODE_ENV as string | undefined) === "staging";
export const isProd = NODE_ENV === "production";

/** APP_ENV drives env-based feature flags. Defaults to NODE_ENV; use NEXT_PUBLIC_APP_ENV for override. */
const appEnvRaw =
  process.env.NEXT_PUBLIC_APP_ENV?.trim() ||
  (process.env.NODE_ENV as string) ||
  "development";
const validEnvs = [
  "development",
  "staging",
  "staging-production",
  "production",
] as const;
export const appEnv: AppEnv = validEnvs.includes(
  appEnvRaw as (typeof validEnvs)[number],
)
  ? (appEnvRaw as AppEnv)
  : "development";

export function getAppEnv(): AppEnv {
  return appEnv;
}

const apiUrlRaw = process.env.NEXT_PUBLIC_API_URL?.trim();
if (!isDev && !apiUrlRaw) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is required in staging and production. Set it in your environment.",
  );
}
export const apiBaseUrl = apiUrlRaw ?? "/api/v1";

export const cookieSecure = !isDev;
export const reactQueryDevtoolsEnabled = isDev;

// Feature availability is resolved here; do NOT add feature checks in UI.
// Env-based flags: use getAppEnv() and isEnvFeatureEnabled() from @repo/shared / features/flags.
// FEATURE_FLAGS env (comma-separated enabled list) overrides the default matrix when set.
export const featureFlagsEnv = process.env.NEXT_PUBLIC_FEATURE_FLAGS?.trim();
