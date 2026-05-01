import { z } from "zod";

/**
 * Custom HTML — raw HTML/CSS block for custom widgets or embeds.
 */
export interface CustomHtmlProps {
  html: string;
  css?: string;
}

/**
 * Zod schema for custom-html props validation.
 */
export const CustomHtmlSchema = z
  .object({
    html: z.string().max(50_000),
    css: z.string().max(10_000).optional(),
  })
  .strict();

export type CustomHtmlInput = z.infer<typeof CustomHtmlSchema>;
