import { z } from "zod";

/**
 * Rich text props — markdown body.
 */
export interface RichTextProps {
  source: string; // markdown
  maxWidth?: "narrow" | "default" | "wide";
  alignment?: "start" | "center";
}

/**
 * Zod schema for rich-text props validation.
 */
export const RichTextSchema = z
  .object({
    source: z.string().min(1).max(100_000),
    maxWidth: z.enum(["narrow", "default", "wide"]).optional(),
    alignment: z.enum(["start", "center"]).optional(),
  })
  .strict();

export type RichTextInput = z.infer<typeof RichTextSchema>;
