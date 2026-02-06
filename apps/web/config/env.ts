/**
 * Build-time env and feature flags. Single source of truth.
 * Do NOT add environment checks in components or stores.
 *
 * Missing required vars in staging/production will throw at build/load.
 */

const NODE_ENV = process.env.NODE_ENV ?? "development";
export const isDev = NODE_ENV === "development";
export const isStaging =
  (process.env.NODE_ENV as string | undefined) === "staging";
export const isProd = NODE_ENV === "production";

const apiUrlRaw = process.env.NEXT_PUBLIC_API_URL?.trim();
if (!isDev && !apiUrlRaw) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is required in staging and production. Set it in your environment.",
  );
}
export const apiBaseUrl = apiUrlRaw ?? "http://localhost:4000/api/v1";

export const cookieSecure = !isDev;
export const reactQueryDevtoolsEnabled = isDev;

// Feature availability is resolved here; do NOT add feature checks in UI.
// New features must be explicitly enabled per environment; default is OFF for staging and production.
export const features = {
  // Example: myFeature: process.env.NEXT_PUBLIC_FEATURE_MY_FEATURE === "1",
} as const;
