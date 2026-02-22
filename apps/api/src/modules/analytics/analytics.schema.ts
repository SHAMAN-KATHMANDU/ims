import { z } from "zod";

const saleTypeSchema = z.enum(["GENERAL", "MEMBER"]);
const creditStatusSchema = z.enum(["credit", "non-credit"]);

const locationIdsSchema = z
  .union([z.string().trim(), z.array(z.string().trim())])
  .optional();

export const analyticsQuerySchema = z.object({
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  locationIds: locationIdsSchema,
  saleType: saleTypeSchema.optional(),
  creditStatus: creditStatusSchema.optional(),
  userId: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  vendorId: z.string().trim().optional(),
});

export const analyticsExportQuerySchema = analyticsQuerySchema.extend({
  type: z.enum([
    "sales-revenue",
    "sales-extended",
    "inventory-ops",
    "customers-promos",
    "trends",
    "financial",
  ]),
  format: z.enum(["csv", "excel"]).optional(),
});
