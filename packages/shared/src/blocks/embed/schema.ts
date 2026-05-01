import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Embed props — calendly, google forms, or any URL.
 */
export interface EmbedProps {
  src: string;
  aspectRatio?: "16/9" | "4/3" | "1/1" | "auto";
  allowFullscreen?: boolean;
  caption?: string;
  title?: string;
  height?: number;
}

/**
 * Zod schema for embed props validation.
 */
export const EmbedSchema = z
  .object({
    src: str(2000),
    aspectRatio: z.enum(["16/9", "4/3", "1/1", "auto"]).optional(),
    allowFullscreen: z.boolean().optional(),
    caption: optStr(300),
    title: optStr(200),
    height: z.number().int().min(50).max(2000).optional(),
  })
  .strict();

export type EmbedInput = z.infer<typeof EmbedSchema>;
