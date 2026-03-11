/**
 * Settings feature Zod schemas.
 */

import { z } from "zod";

export const AuditLogFiltersSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const ErrorReportFiltersSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.string().optional(),
});

export type AuditLogFiltersInput = z.infer<typeof AuditLogFiltersSchema>;
export type ErrorReportFiltersInput = z.infer<typeof ErrorReportFiltersSchema>;
