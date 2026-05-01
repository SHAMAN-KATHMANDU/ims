import { z } from "zod";

/**
 * Markdown body props — legacy markdown block.
 */
export interface MarkdownBodyProps {
  source: string;
  maxWidth?: "narrow" | "default" | "wide";
}

/**
 * Zod schema for markdown-body props validation.
 */
export const MarkdownBodySchema = z
  .object({
    source: z.string().min(1).max(200_000),
    maxWidth: z.enum(["narrow", "default", "wide"]).optional(),
  })
  .strict();

export type MarkdownBodyInput = z.infer<typeof MarkdownBodySchema>;
