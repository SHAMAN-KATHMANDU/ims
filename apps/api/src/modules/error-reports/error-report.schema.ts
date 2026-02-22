import { z } from "zod";

const errorReportStatusSchema = z.enum(["OPEN", "REVIEWED", "RESOLVED"]);

export const createErrorReportSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(255, "Title must be at most 255 characters"),
  description: z.string().trim().max(5000).optional(),
  pageUrl: z.string().trim().max(500).optional(),
});

export const updateErrorReportStatusSchema = z.object({
  status: errorReportStatusSchema,
});

export const errorReportIdParamsSchema = z.object({
  id: z.string().trim().min(1, "id is required"),
});

export const errorReportsListQuerySchema = z.object({
  status: errorReportStatusSchema.optional(),
  userId: z.string().trim().optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
});
