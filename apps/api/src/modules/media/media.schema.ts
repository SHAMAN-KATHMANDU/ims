import { z } from "zod";
import { S3_KEY_ENTITIES } from "@/lib/s3/s3Key";
import { MEDIA_PURPOSE_MAX_BYTES } from "./media.constants";

export const MEDIA_PURPOSES = [
  "product_photo",
  "contact_attachment",
  "library",
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
  });

export type PresignBodyDto = z.infer<typeof PresignBodySchema>;

export const ListMediaQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().uuid().optional(),
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

export const UpdateMediaAssetSchema = z.object({
  fileName: z.string().min(1).max(255),
});

export type UpdateMediaAssetDto = z.infer<typeof UpdateMediaAssetSchema>;
