import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);

/**
 * Stats band props — numeric stat strip.
 */
export interface StatsBandProps {
  items: { value: string; label: string }[];
  dark?: boolean;
  alignment?: "start" | "center" | "end";
  valueSize?: "sm" | "md" | "lg" | "xl";
}

/**
 * Zod schema for stats-band props validation.
 */
export const StatsBandSchema = z
  .object({
    items: z
      .array(z.object({ value: str(40), label: str(80) }).strict())
      .max(10),
    dark: z.boolean().optional(),
    alignment: z.enum(["start", "center", "end"]).optional(),
    valueSize: z.enum(["sm", "md", "lg", "xl"]).optional(),
  })
  .strict();

export type StatsBandInput = z.infer<typeof StatsBandSchema>;
