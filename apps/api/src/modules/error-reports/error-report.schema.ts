import { z } from "zod";

export const CreateErrorReportSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(5000).optional().nullable(),
  pageUrl: z.string().max(500).optional().nullable(),
});

export const UpdateErrorReportStatusSchema = z.object({
  status: z.enum(["OPEN", "REVIEWED", "RESOLVED"]),
});

export type CreateErrorReportDto = z.infer<typeof CreateErrorReportSchema>;
export type UpdateErrorReportStatusDto = z.infer<
  typeof UpdateErrorReportStatusSchema
>;
