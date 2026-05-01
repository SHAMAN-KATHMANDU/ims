import { z } from "zod";

/**
 * Divider props — horizontal rule.
 */
export interface DividerProps {
  variant?: "line" | "dotted" | "dashed";
  inset?: boolean;
  colorToken?: string;
}

/**
 * Zod schema for divider props validation.
 */
export const DividerSchema = z
  .object({
    variant: z.enum(["line", "dotted", "dashed"]).optional(),
    inset: z.boolean().optional(),
    colorToken: z.string().max(80).optional(),
  })
  .strict();

export type DividerInput = z.infer<typeof DividerSchema>;
