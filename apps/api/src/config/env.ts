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

const PHOTOS_S3_KEY_PREFIX_VALUES = ["dev", "stage", "prod"] as const;
type PhotosS3KeyPrefix = (typeof PHOTOS_S3_KEY_PREFIX_VALUES)[number];

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
    REDIS_URL: z.string().optional(),
    META_APP_ID: z.string().optional(),
    META_APP_SECRET: z.string().optional(),
    CREDENTIAL_ENCRYPTION_KEY: z.string().optional(),
    AI_REPLY_PROVIDER: z
      .enum(["OPENAI_RESPONSES", "OPENAI_COMPAT_CHAT", "GEMINI_API"])
      .optional()
      .default("GEMINI_API"),
    AI_REPLY_MODEL: z.string().optional().default("gemini-2.5-flash"),
    AI_REPLY_API_KEY: z.string().optional().default(""),
    AI_REPLY_BASE_URL: z
      .string()
      .optional()
      .default("https://generativelanguage.googleapis.com/v1beta"),
    AI_REPLY_ENABLED_DEFAULT: z
      .string()
      .optional()
      .default("false")
      .transform((v) => v.toLowerCase() === "true"),
    BRAINTRUST_API_KEY: z.string().optional().default(""),
    BRAINTRUST_PROJECT_NAME: z.string().optional().default("IMS AI Replies"),
    AWS_REGION: z.string().optional(),
    PHOTOS_S3_BUCKET: z.string().optional(),
    PHOTOS_PUBLIC_URL_PREFIX: z.string().optional(),
    PHOTOS_S3_KEY_PREFIX: z.string().optional(),
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

    /** Base origin for static assets (uploads); strip /api/v1 from API_PUBLIC_URL */
    const publicServerOrigin = publicApiUrl.replace(/\/api\/v1\/?$/, "");

    const awsRegion = raw.AWS_REGION?.trim() ?? "";
    const photosS3Bucket = raw.PHOTOS_S3_BUCKET?.trim() ?? "";
    const photosPublicUrlPrefixRaw = raw.PHOTOS_PUBLIC_URL_PREFIX?.trim() ?? "";

    if (!isDev) {
      if (!awsRegion) {
        throw new z.ZodError([
          {
            code: "custom",
            path: ["AWS_REGION"],
            message: "AWS_REGION is required in staging and production.",
          },
        ]);
      }
      if (!photosS3Bucket || !photosPublicUrlPrefixRaw) {
        throw new z.ZodError([
          {
            code: "custom",
            path: ["PHOTOS_S3_BUCKET"],
            message:
              "PHOTOS_S3_BUCKET and PHOTOS_PUBLIC_URL_PREFIX are required in staging and production.",
          },
        ]);
      }
    }

    const photosPublicUrlPrefix = photosPublicUrlPrefixRaw
      ? photosPublicUrlPrefixRaw.endsWith("/")
        ? photosPublicUrlPrefixRaw
        : `${photosPublicUrlPrefixRaw}/`
      : "";

    function parsePhotosS3KeyPrefix(): PhotosS3KeyPrefix {
      const p = raw.PHOTOS_S3_KEY_PREFIX?.trim().toLowerCase();
      if (p) {
        if (!PHOTOS_S3_KEY_PREFIX_VALUES.includes(p as PhotosS3KeyPrefix)) {
          throw new z.ZodError([
            {
              code: "custom",
              path: ["PHOTOS_S3_KEY_PREFIX"],
              message: "PHOTOS_S3_KEY_PREFIX must be one of: dev, stage, prod.",
            },
          ]);
        }
        return p as PhotosS3KeyPrefix;
      }
      if (isDev) return "dev";
      if (isStaging) return "stage";
      if (isProd) return "prod";
      return "dev";
    }

    const photosS3KeyPrefix = parsePhotosS3KeyPrefix();
    const photosS3Configured = Boolean(
      awsRegion && photosS3Bucket && photosPublicUrlPrefix,
    );

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
      publicServerOrigin:
        publicServerOrigin.length > 0
          ? publicServerOrigin
          : "http://localhost:4000",
      appEnv,
      featureFlags: raw.FEATURE_FLAGS?.trim(),
      features: {} as const,
      redisUrl: raw.REDIS_URL?.trim() ?? "redis://localhost:6379",
      metaAppId: raw.META_APP_ID?.trim() ?? "",
      metaAppSecret: raw.META_APP_SECRET?.trim() ?? "",
      credentialEncryptionKey: raw.CREDENTIAL_ENCRYPTION_KEY?.trim() ?? "",
      aiReplyProvider: raw.AI_REPLY_PROVIDER,
      aiReplyModel: raw.AI_REPLY_MODEL.trim(),
      aiReplyApiKey: raw.AI_REPLY_API_KEY.trim(),
      aiReplyBaseUrl: raw.AI_REPLY_BASE_URL.trim(),
      aiReplyEnabledDefault: raw.AI_REPLY_ENABLED_DEFAULT,
      braintrustApiKey: raw.BRAINTRUST_API_KEY.trim(),
      braintrustProjectName: raw.BRAINTRUST_PROJECT_NAME.trim(),
      awsRegion,
      photosS3Bucket,
      photosPublicUrlPrefix,
      photosS3KeyPrefix,
      photosS3Configured,
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
