import { z } from "zod";

const bulkTypeSchema = z.enum(["products", "members", "sales"]);

export const bulkUploadParamsSchema = z.object({
  type: bulkTypeSchema,
});

export const bulkTemplateQuerySchema = z.object({
  type: bulkTypeSchema,
});

export const bulkDownloadQuerySchema = z.object({
  type: bulkTypeSchema,
  format: z
    .preprocess(
      (value) => (typeof value === "string" ? value.toLowerCase() : value),
      z.enum(["excel", "csv"]),
    )
    .optional(),
  ids: z.string().trim().optional(),
});
