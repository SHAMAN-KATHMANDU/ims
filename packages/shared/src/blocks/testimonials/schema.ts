import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Testimonials props — customer quote cards.
 */
export interface TestimonialsProps {
  heading?: string;
  items: { quote: string; author: string; role?: string }[];
  layout?: "grid" | "carousel" | "stacked";
  columns?: 2 | 3;
  showAvatar?: boolean;
}

/**
 * Zod schema for testimonials props validation.
 */
export const TestimonialsSchema = z
  .object({
    heading: optStr(200),
    items: z
      .array(
        z
          .object({
            quote: z.string().max(1000),
            author: str(100),
            role: optStr(100),
          })
          .strict(),
      )
      .max(20),
    layout: z.enum(["grid", "carousel", "stacked"]).optional(),
    columns: z.union([z.literal(2), z.literal(3)]).optional(),
    showAvatar: z.boolean().optional(),
  })
  .strict();

export type TestimonialsInput = z.infer<typeof TestimonialsSchema>;
