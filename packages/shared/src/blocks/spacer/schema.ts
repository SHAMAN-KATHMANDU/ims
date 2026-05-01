import { z } from "zod";

/**
 * Spacer props — vertical whitespace.
 */
export interface SpacerProps {
  size: "xs" | "sm" | "md" | "lg" | "xl";
  customPx?: number;
}

/**
 * Zod schema for spacer props validation.
 */
export const SpacerSchema = z
  .object({
    size: z.enum(["xs", "sm", "md", "lg", "xl"]),
    customPx: z.number().int().min(0).max(500).optional(),
  })
  .strict();

export type SpacerInput = z.infer<typeof SpacerSchema>;
