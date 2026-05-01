import { z } from "zod";

/**
 * Columns — 2, 3, or 4-column layout for side-by-side content.
 */
export interface ColumnsProps {
  count: 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
  verticalAlign?: "start" | "center" | "end";
  stackBelow?: "sm" | "md" | "lg";
  stickyFirst?: boolean;
}

/**
 * Zod schema for columns props validation.
 */
export const ColumnsSchema = z
  .object({
    count: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    gap: z.enum(["sm", "md", "lg"]).optional(),
    verticalAlign: z.enum(["start", "center", "end"]).optional(),
    stackBelow: z.enum(["sm", "md", "lg"]).optional(),
    stickyFirst: z.boolean().optional(),
  })
  .strict();

export type ColumnsInput = z.infer<typeof ColumnsSchema>;
