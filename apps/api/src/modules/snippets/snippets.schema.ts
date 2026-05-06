/**
 * Snippets schemas — Phase 5 reusable BlockNode[] sub-trees.
 */

import { z } from "zod";
import { BlockTreeSchema } from "@repo/shared";

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,80}$/;

const optionalString = (max: number) =>
  z.string().trim().max(max).optional().nullable();

const slugField = z
  .string()
  .trim()
  .regex(SLUG_REGEX, "Lowercase letters, digits, and dashes only")
  .max(80);

export const CreateSnippetSchema = z.object({
  slug: slugField,
  title: z.string().trim().min(1).max(160),
  category: optionalString(60),
  body: BlockTreeSchema.default([]),
});

export const UpdateSnippetSchema = z
  .object({
    slug: slugField.optional(),
    title: z.string().trim().min(1).max(160).optional(),
    category: optionalString(60),
    body: BlockTreeSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  });

export const ListSnippetsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  category: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
});

export type CreateSnippetInput = z.infer<typeof CreateSnippetSchema>;
export type UpdateSnippetInput = z.infer<typeof UpdateSnippetSchema>;
export type ListSnippetsQuery = z.infer<typeof ListSnippetsQuerySchema>;
