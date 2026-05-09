/**
 * Site template validation schemas.
 */

import { z } from "zod";

export const ForkTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name too long"),
});

export type ForkTemplateInput = z.infer<typeof ForkTemplateSchema>;

export const UpdateTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name too long")
    .optional(),
  description: z.string().max(500, "Description too long").optional(),
  defaultLayouts: z.record(z.any()).nullable().optional(),
  defaultThemeTokens: z.record(z.any()).nullable().optional(),
  defaultBranding: z.record(z.any()).nullable().optional(),
  defaultSections: z.record(z.any()).nullable().optional(),
  defaultPages: z.record(z.any()).nullable().optional(),
});

export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>;

export const CreateTemplateSchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  category: z.string().max(40).optional(),
  defaultBranding: z.record(z.any()).nullable().optional(),
  defaultSections: z.record(z.any()).nullable().optional(),
  defaultPages: z.record(z.any()).nullable().optional(),
  defaultLayouts: z.record(z.any()).nullable().optional(),
  defaultThemeTokens: z.record(z.any()).nullable().optional(),
});

export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
