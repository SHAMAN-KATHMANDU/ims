import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Heading props — h1..h4 with optional eyebrow + subtitle.
 */
export interface HeadingProps {
  text: string;
  level: 1 | 2 | 3 | 4;
  alignment?: "start" | "center" | "end";
  eyebrow?: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg" | "xl";
  decoration?: "none" | "underline" | "gradient";
}

/**
 * Zod schema for heading props validation.
 */
export const HeadingSchema = z
  .object({
    text: str(300),
    level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    alignment: z.enum(["start", "center", "end"]).optional(),
    eyebrow: optStr(100),
    subtitle: optStr(400),
    size: z.enum(["sm", "md", "lg", "xl"]).optional(),
    decoration: z.enum(["none", "underline", "gradient"]).optional(),
  })
  .strict();

export type HeadingInput = z.infer<typeof HeadingSchema>;
