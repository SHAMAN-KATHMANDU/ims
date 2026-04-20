import { z } from "zod";

export const BULK_TYPES = [
  "products",
  "members",
  "sales",
  "discounts",
] as const;
export type BulkType = (typeof BULK_TYPES)[number];

export const BulkTypeSchema = z.enum(BULK_TYPES, {
  errorMap: () => ({
    message:
      "Invalid or missing type. Use type=products|members|sales|discounts",
  }),
});

export const BulkUploadQuerySchema = z.object({
  type: z
    .string()
    .transform((s) => s.toLowerCase().trim())
    .pipe(BulkTypeSchema),
});

export const BulkDownloadQuerySchema = z.object({
  type: BulkTypeSchema,
  format: z.enum(["xlsx", "csv"]).optional(),
  ids: z.string().optional(),
});
