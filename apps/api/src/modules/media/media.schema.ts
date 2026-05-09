import { z } from "zod";
import { S3_KEY_ENTITIES } from "@/lib/s3/s3Key";
import { MEDIA_PURPOSE_MAX_BYTES } from "./media.constants";

export const MEDIA_PURPOSES = [
  "product_photo",
  "contact_attachment",
  "library",
  "message_media",
] as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const PresignBodySchema = z
  .object({
    purpose: z.enum(MEDIA_PURPOSES),
    mimeType: z.string().min(1).max(120),
    fileName: z.string().max(255).optional(),
    /** Exact upload size in bytes; enforced on the signed PUT. */
    contentLength: z
      .number()
      .int()
      .positive()
      .max(200 * 1024 * 1024),
    entityType: z.enum(S3_KEY_ENTITIES).optional(),
    entityId: z.string().min(1).max(128).optional(),
  })
  .superRefine((data, ctx) => {
    const max = MEDIA_PURPOSE_MAX_BYTES[data.purpose];
    if (data.contentLength > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `contentLength exceeds max for ${data.purpose}`,
        path: ["contentLength"],
      });
    }
    if (data.purpose === "contact_attachment") {
      if (!data.entityId || !UUID_RE.test(data.entityId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "entityId (contact UUID) is required for contact_attachment presign",
          path: ["entityId"],
        });
      }
    }
    if (data.purpose === "message_media") {
      if (!data.entityId || !UUID_RE.test(data.entityId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "entityId (conversation UUID) is required for message_media presign",
          path: ["entityId"],
        });
      }
    }
  });

export type PresignBodyDto = z.infer<typeof PresignBodySchema>;

export const ListMediaQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().uuid().optional(),
  /** When set, only assets whose purpose matches (exact). */
  purpose: z.enum(MEDIA_PURPOSES).optional(),
  /** When set, only assets whose mimeType starts with this prefix (e.g. image/, video/). */
  mimePrefix: z.string().trim().min(1).max(40).optional(),
  /** When set, only assets in this folder (case-sensitive). Use "__none__" to filter for null folder. */
  folder: z.string().max(80).optional(),
});

export type ListMediaQueryDto = z.infer<typeof ListMediaQuerySchema>;

export const RegisterMediaAssetSchema = z.object({
  storageKey: z.string().min(1).max(768),
  /** Optional; server computes canonical URL from storage key and PHOTOS_PUBLIC_URL_PREFIX. */
  publicUrl: z.string().url().max(1024).optional(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  byteSize: z.coerce
    .number()
    .int()
    .positive()
    .max(200 * 1024 * 1024)
    .optional(),
  purpose: z.enum(MEDIA_PURPOSES),
});

export type RegisterMediaAssetDto = z.infer<typeof RegisterMediaAssetSchema>;

/** Path params for routes that use `:id` as a media asset UUID. */
export const MediaAssetIdParamsSchema = z.object({
  id: z.string().uuid("Invalid media asset id"),
});

export type MediaAssetIdParamsDto = z.infer<typeof MediaAssetIdParamsSchema>;

export const UpdateMediaAssetSchema = z.object({
  fileName: z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(1, "Display name cannot be empty")
        .max(255, "Display name must be at most 255 characters"),
    )
    .optional(),
  altText: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(1000, "Alt text must be at most 1000 characters"))
    .nullable()
    .optional(),
  folder: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(80, "Folder name must be at most 80 characters"))
    .nullable()
    .optional(),
});

export type UpdateMediaAssetDto = z.infer<typeof UpdateMediaAssetSchema>;
