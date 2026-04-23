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
const validEnvs = [
  "development",
  "staging",
  "staging-production",
  "production",
] as const;

function normalize(v: string | undefined): string | undefined {
  const t = v?.trim().toLowerCase();
  return t && t.length > 0 ? t : undefined;
}

const appEnvRaw =
  normalize(process.env.NEXT_PUBLIC_APP_ENV) ??
  normalize(process.env.NODE_ENV as string | undefined);

// Default to the restrictive side of NODE_ENV when APP_ENV is missing or
// unrecognized. A misconfigured production build must NOT silently unlock
// every flag by falling back to "development".
const safeDefault: AppEnv = isProd ? "production" : "development";

export const appEnv: AppEnv =
  appEnvRaw && validEnvs.includes(appEnvRaw as (typeof validEnvs)[number])
    ? (appEnvRaw as AppEnv)
    : safeDefault;

if (
  appEnvRaw &&
  !validEnvs.includes(appEnvRaw as (typeof validEnvs)[number]) &&
  typeof console !== "undefined"
) {
  console.warn(
    `[env] NEXT_PUBLIC_APP_ENV="${appEnvRaw}" is not a recognized value. ` +
      `Valid values: ${validEnvs.join(", ")}. Resolved to "${appEnv}".`,
  );
}

export function getAppEnv(): AppEnv {
  return appEnv;
}

const apiUrlRaw = process.env.NEXT_PUBLIC_API_URL?.trim();
const isTest = NODE_ENV === "test";
if (!isDev && !isTest && !apiUrlRaw) {
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
