import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Accordion — collapsible content sections.
 */
export interface AccordionProps {
  items: { title: string; body: string }[];
  allowMultiple?: boolean;
  heading?: string;
  icon?: "chevron" | "plus" | "arrow";
  variant?: "bordered" | "minimal" | "card";
}

/**
 * Zod schema for accordion props validation.
 */
export const AccordionSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            title: str(300),
            body: z.string().max(5000),
          })
          .strict(),
      )
      .max(50),
    allowMultiple: z.boolean().optional(),
    heading: optStr(200),
    icon: z.enum(["chevron", "plus", "arrow"]).optional(),
    variant: z.enum(["bordered", "minimal", "card"]).optional(),
  })
  .strict();

export type AccordionInput = z.infer<typeof AccordionSchema>;
