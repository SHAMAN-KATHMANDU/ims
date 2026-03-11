/**
 * Analytics feature Zod schemas.
 */

import { z } from "zod";

export const AnalyticsFiltersSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  preset: z.string().optional(),
  locationIds: z.array(z.string()).optional().default([]),
  saleType: z.enum(["GENERAL", "MEMBER"]).optional(),
  creditStatus: z
    .enum(["all", "outstanding", "clear"])
    .optional()
    .default("all"),
  userId: z.string().optional(),
  categoryId: z.string().optional(),
  vendorId: z.string().optional(),
});

export type AnalyticsFiltersInput = z.infer<typeof AnalyticsFiltersSchema>;
