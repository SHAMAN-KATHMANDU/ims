/**
 * Tenant-admin schemas for the WebsiteOrder module (list / get / verify /
 * reject / convert / delete). The public guest-checkout POST body lives
 * in public-orders.schema.ts.
 */

import { z } from "zod";

export const ListWebsiteOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(["PENDING_VERIFICATION", "VERIFIED", "REJECTED", "CONVERTED_TO_SALE"])
    .optional(),
  search: z.string().trim().min(1).optional(),
});

export const RejectOrderSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export const ConvertOrderSchema = z.object({
  /** Required: which showroom to book the sale against. */
  locationId: z.string().uuid(),
  /** Optional: if the admin wants to edit the items before conversion. */
  itemOverrides: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variationId: z.string().uuid(),
        quantity: z.number().int().min(1),
      }),
    )
    .optional(),
  /** Per-item source location overrides for multi-location auto-transfer. */
  itemLocationOverrides: z
    .array(
      z.object({
        productId: z.string().uuid(),
        sourceLocationId: z.string().uuid(),
      }),
    )
    .optional(),
  /** Payment split at conversion time. If omitted, the sale becomes credit. */
  payments: z
    .array(
      z.object({
        method: z.string().trim().min(1).max(32),
        amount: z.number().nonnegative(),
      }),
    )
    .optional(),
  isCreditSale: z.boolean().optional(),
});

export type ListWebsiteOrdersQuery = z.infer<
  typeof ListWebsiteOrdersQuerySchema
>;
export type RejectOrderInput = z.infer<typeof RejectOrderSchema>;
export type ConvertOrderInput = z.infer<typeof ConvertOrderSchema>;
