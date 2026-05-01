import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * CSS Grid — advanced N-column grid layout (1–12 cols). Container block.
 */
export interface CssGridProps {
  columns: number;
  gap?: "sm" | "md" | "lg";
  minRowHeight?: string;
  mobileColumns?: number;
  tabletColumns?: number;
}

/**
 * Zod schema for css-grid props validation.
 */
export const CssGridSchema = z
  .object({
    columns: z.number().int().min(1).max(12),
    gap: z.enum(["sm", "md", "lg"]).optional(),
    minRowHeight: z.string().max(20).optional(),
    mobileColumns: z.number().int().min(1).max(12).optional(),
    tabletColumns: z.number().int().min(1).max(12).optional(),
  })
  .strict();

export type CssGridInput = z.infer<typeof CssGridSchema>;
