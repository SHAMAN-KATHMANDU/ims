/**
 * Redirects schemas — Zod validation for tenant URL redirect rules.
 */

import { z } from "zod";

const pathString = z
  .string()
  .trim()
  .min(1, "Path must not be empty")
  .max(500, "Path too long (max 500 chars)")
  .refine((p) => p.startsWith("/"), { message: "Path must start with /" });

export const CreateRedirectSchema = z
  .object({
    fromPath: pathString,
    toPath: pathString,
    statusCode: z.literal(301).or(z.literal(302)).default(301),
    isActive: z.boolean().default(true),
  })
  .refine((d) => d.fromPath !== d.toPath, {
    message: "fromPath and toPath must differ",
    path: ["toPath"],
  });

export type CreateRedirectDto = z.infer<typeof CreateRedirectSchema>;

export const UpdateRedirectSchema = z
  .object({
    fromPath: pathString.optional(),
    toPath: pathString.optional(),
    statusCode: z.literal(301).or(z.literal(302)).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (d) => {
      if (d.fromPath !== undefined && d.toPath !== undefined) {
        return d.fromPath !== d.toPath;
      }
      return true;
    },
    { message: "fromPath and toPath must differ", path: ["toPath"] },
  );

export type UpdateRedirectDto = z.infer<typeof UpdateRedirectSchema>;
