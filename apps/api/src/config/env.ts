/**
 * Environment and runtime config. Single source of truth.
 * Do NOT read process.env elsewhere in the API.
 *
 * Fail-fast: validated via Zod at load time. Missing or invalid vars in
 * staging/production cause process.exit(1) with descriptive errors.
 */

import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const APP_ENV_VALUES = [
  "development",
  "staging",
  "staging-production",
  "production",
] as const;

const EnvSchema = z
  .object({
    NODE_ENV: z
      .string()
      .optional()
      .default("development")
      .refine((v) => ["development", "staging", "production"].includes(v), {
        message: "NODE_ENV must be development, staging, or production",
      }),
    APP_ENV: z.string().optional(),
    FEATURE_FLAGS: z.string().optional(),
    PORT: z
      .string()
      .optional()
      .default("4000")
      .transform((v) => parseInt(v, 10))
      .refine((n) => !isNaN(n) && n >= 1 && n <= 65535, {
        message: "PORT must be a number between 1 and 65535",
      }),
    HOST: z.string().optional().default("0.0.0.0"),
    JWT_SECRET: z.string().optional().default(""),
    DATABASE_URL: z.string().optional().default(""),
    CORS_ORIGIN: z.string().optional(),
    API_PUBLIC_URL: z.string().optional(),
  })
  .transform((raw) => {
    const isDev = raw.NODE_ENV === "development";
    const isStaging = raw.NODE_ENV === "staging";
    const isProd = raw.NODE_ENV === "production";

    if (!isDev) {
      if (!raw.JWT_SECRET?.trim()) {
        throw new z.ZodError([
          {
            code: "custom",
            path: ["JWT_SECRET"],
            message: "JWT_SECRET is required in staging and production",
          },
        ]);
      }
      if (!raw.DATABASE_URL?.trim()) {
        throw new z.ZodError([
          {
            code: "custom",
            path: ["DATABASE_URL"],
            message: "DATABASE_URL is required in staging and production",
          },
        ]);
      }
      if (!raw.CORS_ORIGIN?.trim()) {
        throw new z.ZodError([
          {
            code: "custom",
            path: ["CORS_ORIGIN"],
            message:
              "CORS_ORIGIN is required in staging and production. Set it to your frontend origin(s).",
          },
        ]);
      }
      if (!raw.API_PUBLIC_URL?.trim()) {
        throw new z.ZodError([
          {
            code: "custom",
            path: ["API_PUBLIC_URL"],
            message:
              "API_PUBLIC_URL is required in staging and production for API docs.",
          },
        ]);
      }
    }

    let corsOrigin: string | string[];
    if (raw.CORS_ORIGIN?.trim()) {
      corsOrigin = raw.CORS_ORIGIN.includes(",")
        ? raw.CORS_ORIGIN.split(",")
            .map((o) => o.trim())
            .filter(Boolean)
        : raw.CORS_ORIGIN.trim();
    } else if (isDev) {
      corsOrigin = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
      ];
    } else {
      corsOrigin = []; // unreachable due to throw above
    }

    const publicApiUrl =
      raw.API_PUBLIC_URL?.trim() ?? "http://localhost:4000/api/v1";

    const appEnvRaw = raw.APP_ENV?.trim() || raw.NODE_ENV || "development";
    const appEnv = APP_ENV_VALUES.includes(
      appEnvRaw as (typeof APP_ENV_VALUES)[number],
    )
      ? (appEnvRaw as (typeof APP_ENV_VALUES)[number])
      : "development";

    return {
      nodeEnv: raw.NODE_ENV,
      isDev,
      isStaging,
      isProd,
      port: raw.PORT,
      host: raw.HOST.trim() || "0.0.0.0",
      jwtSecret: raw.JWT_SECRET ?? "",
      databaseUrl: raw.DATABASE_URL ?? "",
      corsOrigin,
      publicApiUrl,
      appEnv,
      featureFlags: raw.FEATURE_FLAGS?.trim(),
      features: {} as const,
    };
  });

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const msg = parsed.error.errors
    .map((e) => `${e.path.join(".")}: ${e.message}`)
    .join("\n");
  console.error("FATAL: Invalid environment configuration:\n", msg);
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
