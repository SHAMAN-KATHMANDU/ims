/**
 * Environment and runtime config. Single source of truth.
 * Do NOT read process.env elsewhere in the API.
 *
 * Fail-fast: missing required vars in staging/production will exit(1) on load.
 */

import dotenv from "dotenv";

dotenv.config();

const NODE_ENV = process.env.NODE_ENV ?? "development";
const isDev = NODE_ENV === "development";
const isStaging = NODE_ENV === "staging";
const isProd = NODE_ENV === "production";

// In non-dev, required vars must be set; no silent fallbacks.
if (!isDev) {
  if (!process.env.JWT_SECRET?.trim()) {
    console.error("FATAL: JWT_SECRET is required in staging and production.");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("FATAL: DATABASE_URL is required in staging and production.");
    process.exit(1);
  }
}

// Port and Host validation
const portEnv = process.env.PORT?.trim();
if (!isDev && portEnv) {
  const portNum = parseInt(portEnv, 10);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    console.error("FATAL: PORT must be a valid number between 1 and 65535.");
    process.exit(1);
  }
}
const port = parseInt(portEnv ?? "4000", 10);
const host = process.env.HOST?.trim() ?? "0.0.0.0";

const jwtSecret = process.env.JWT_SECRET ?? "";
const databaseUrl = process.env.DATABASE_URL ?? "";

// CORS: must be set explicitly in staging/production.
// With credentials (cookies), the browser requires a specific origin, not "*".
// In dev, default to common local frontend origins so credentials work.
// CORS_ORIGIN can be a single origin or comma-separated list.
const corsOriginRaw = process.env.CORS_ORIGIN?.trim();
let corsOrigin: string | string[];
if (corsOriginRaw) {
  corsOrigin = corsOriginRaw.includes(",")
    ? corsOriginRaw
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean)
    : corsOriginRaw;
} else if (isDev) {
  corsOrigin = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
  ];
} else {
  console.error(
    "FATAL: CORS_ORIGIN is required in staging and production. Set it to your frontend origin(s).",
  );
  process.exit(1);
}

// Swagger server URL. In dev default to localhost; in staging/prod must be set.
const apiPublicUrlEnv = process.env.API_PUBLIC_URL?.trim();
if (!isDev && !apiPublicUrlEnv) {
  console.error(
    "FATAL: API_PUBLIC_URL is required in staging and production for API docs.",
  );
  process.exit(1);
}
const publicApiUrl = apiPublicUrlEnv ?? "http://localhost:4000/api/v1";

// Redis (required for messaging queues and Socket.IO adapter)
const redisUrl = process.env.REDIS_URL?.trim() ?? "redis://localhost:6379";

// Meta / Facebook Messenger integration
const metaAppId = process.env.META_APP_ID?.trim() ?? "";
const metaAppSecret = process.env.META_APP_SECRET?.trim() ?? "";

// Credential encryption key (32-byte hex string for AES-256-GCM)
const credentialEncryptionKey =
  process.env.CREDENTIAL_ENCRYPTION_KEY?.trim() ?? "";

// Feature availability is resolved here; do NOT add feature checks in controllers beyond reading env.features.
// New features must be explicitly enabled per environment; default is OFF for staging and production.
const features = {
  // Example: myFeature: process.env.FEATURE_MY_FEATURE === "1",
} as const;

export const env = Object.freeze({
  nodeEnv: NODE_ENV,
  isDev,
  isStaging,
  isProd,
  port,
  host,
  jwtSecret,
  databaseUrl,
  corsOrigin,
  publicApiUrl,
  features,
  redisUrl,
  metaAppId,
  metaAppSecret,
  credentialEncryptionKey,
});
