import { z } from "zod";

/**
 * Row — flexible horizontal row with gap and alignment options.
 */
export interface RowProps {
  gap?: "none" | "xs" | "sm" | "md" | "lg" | "xl";
  wrap?: boolean;
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  align?: "start" | "center" | "end" | "stretch";
  reverse?: boolean;
}

/**
 * Zod schema for row props validation.
 */
export const RowSchema = z
  .object({
    gap: z.enum(["none", "xs", "sm", "md", "lg", "xl"]).optional(),
    wrap: z.boolean().optional(),
    justify: z
      .enum(["start", "center", "end", "between", "around", "evenly"])
      .optional(),
    align: z.enum(["start", "center", "end", "stretch"]).optional(),
    reverse: z.boolean().optional(),
  })
  .strict();

export type RowInput = z.infer<typeof RowSchema>;
