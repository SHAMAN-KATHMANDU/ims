import { z } from "zod";
import { BlockTreeSchema } from "@repo/shared";

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,80}$/;

export const SnippetFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(SLUG_REGEX, "Lowercase letters, digits, and dashes only")
    .max(80),
  title: z.string().trim().min(1, "Title is required").max(160),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  body: BlockTreeSchema.default([]),
});

export type SnippetFormInput = z.infer<typeof SnippetFormSchema>;

export function slugifyTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
