/**
 * Public (unauthenticated) checkout schema.
 *
 * The guest gives name + phone + an optional email + an optional note.
 * The cart comes as a JSON array of product snapshots — productId,
 * productName, unitPrice, quantity. The server recomputes the subtotal
 * so the client can't lie about the total.
 *
 * Phone format is free-text up to 40 chars: we don't parse-validate
 * phones here because tenants span many countries and formats, and the
 * value is used as a contact string, not a FK.
 */

import { z } from "zod";

export const CartItemSchema = z.object({
  productId: z.string().uuid("Invalid product id"),
  productName: z.string().trim().min(1).max(300),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().int().min(1).max(99),
  lineTotal: z.number().nonnegative(),
});

export const CreateGuestOrderSchema = z.object({
  customerName: z.string().trim().min(1, "Name is required").max(200),
  customerPhone: z.string().trim().min(6, "Phone looks too short").max(40),
  customerEmail: z
    .string()
    .trim()
    .email("Must be a valid email")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  customerNote: z.string().trim().max(2000).optional().or(z.literal("")),
  items: z
    .array(CartItemSchema)
    .min(1, "Cart is empty")
    .max(50, "Cart is too large"),
});

export type CartItem = z.infer<typeof CartItemSchema>;
export type CreateGuestOrderInput = z.infer<typeof CreateGuestOrderSchema>;
