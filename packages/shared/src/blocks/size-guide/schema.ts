import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Size guide — sizing info table.
 */
export interface SizeGuideRow {
  label: string;
  values: string[];
}

export interface SizeGuideProps {
  triggerLabel?: string;
  heading?: string;
  description?: string;
  columns: string[];
  rows: SizeGuideRow[];
  note?: string;
  variant?: "inline" | "modal";
}

/**
 * Zod schema for size-guide props validation.
 */
export const SizeGuideSchema = z
  .object({
    triggerLabel: optStr(80),
    heading: optStr(200),
    description: optStr(500),
    columns: z.array(str(30)).min(1).max(10),
    rows: z
      .array(
        z
          .object({
            label: str(80),
            values: z.array(str(30)).min(1).max(10),
          })
          .strict(),
      )
      .min(1)
      .max(20),
    note: optStr(500),
    variant: z.enum(["inline", "modal"]).optional(),
  })
  .strict();

export type SizeGuideInput = z.infer<typeof SizeGuideSchema>;
