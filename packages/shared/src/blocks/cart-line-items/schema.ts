import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Cart line items — renders the tenant's current cart contents.
 *
 * The renderer reads the cart from BlockDataContext on the client; props
 * here only configure presentation (variant chips, qty controls, empty
 * state copy). One per cart page.
 */
export interface CartLineItemsProps {
  /** Show selected variant options under each product name. */
  showVariants?: boolean;
  /** Render a remove button on each line. */
  showRemove?: boolean;
  /** "stepper" = − / + buttons; "input" = numeric input field. */
  qtyControls?: "stepper" | "input";
  /** Copy shown when the cart is empty. */
  emptyStateText?: string;
  /** Heading rendered above the line list. */
  heading?: string;
  /** Optional thumbnail aspect ratio. */
  thumbnailAspect?: "1/1" | "3/4" | "4/5";
}

export const CartLineItemsSchema = z
  .object({
    showVariants: z.boolean().optional(),
    showRemove: z.boolean().optional(),
    qtyControls: z.enum(["stepper", "input"]).optional(),
    emptyStateText: optStr(280),
    heading: optStr(120),
    thumbnailAspect: z.enum(["1/1", "3/4", "4/5"]).optional(),
  })
  .strict();

export type CartLineItemsInput = z.infer<typeof CartLineItemsSchema>;
