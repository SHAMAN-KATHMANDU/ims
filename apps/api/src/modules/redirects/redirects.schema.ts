/**
 * Redirect management schemas.
 */

import { z } from "zod";

/**
 * Path validation: must start with / and be under 500 chars.
 */
const PathSchema = z
  .string()
  .trim()
  .refine((p) => p.startsWith("/"), "Path must start with /")
  .refine((p) => p.length <= 500, "Path must be under 500 characters");

/**
 * HTTP status code for redirect: 301 (permanent) or 302 (temporary).
 */
const StatusCodeSchema = z.enum(["301", "302"]).transform(Number);

export const CreateRedirectSchema = z.object({
  fromPath: PathSchema,
  toPath: PathSchema,
  statusCode: z.number().int().refine((s) => s === 301 || s === 302, {
    message: "Status code must be 301 or 302",
  }),
  isActive: z.boolean().optional().default(true),
});

export const UpdateRedirectSchema = z.object({
  fromPath: PathSchema.optional(),
  toPath: PathSchema.optional(),
  statusCode: z
    .number()
    .int()
    .refine((s) => s === 301 || s === 302, {
      message: "Status code must be 301 or 302",
    })
    .optional(),
  isActive: z.boolean().optional(),
});

// ——— INFERRED TYPES ———

export type CreateRedirectInput = z.infer<typeof CreateRedirectSchema>;
export type UpdateRedirectInput = z.infer<typeof UpdateRedirectSchema>;
