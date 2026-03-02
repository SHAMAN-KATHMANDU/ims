import { z } from "zod";

const locationIdsSchema = z
  .union([
    z.string().transform((s) => [
      ...new Set(
        s
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      ),
    ]),
    z.array(z.string()).transform((arr) => [...new Set(arr.filter(Boolean))]),
  ])
  .optional();

export const AnalyticsQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  locationIds: locationIdsSchema,
  saleType: z.enum(["GENERAL", "MEMBER"]).optional(),
  creditStatus: z.enum(["credit", "non-credit"]).optional(),
  userId: z.string().optional(),
  categoryId: z.string().optional(),
  vendorId: z.string().optional(),
});

export const ExportAnalyticsQuerySchema = AnalyticsQuerySchema.extend({
  type: z.string().optional(),
  format: z.enum(["csv", "excel"]).optional(),
});

export type AnalyticsQueryDto = z.infer<typeof AnalyticsQuerySchema>;
export type ExportAnalyticsQueryDto = z.infer<
  typeof ExportAnalyticsQuerySchema
>;
