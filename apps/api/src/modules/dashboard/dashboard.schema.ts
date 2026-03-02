import { z } from "zod";

/**
 * Dashboard endpoints are GET-only with no request body.
 * Schema file kept for API architecture consistency.
 */

export const DashboardUserSummaryQuerySchema = z.object({}).strict();
export const DashboardAdminSummaryQuerySchema = z.object({}).strict();
export const DashboardSuperAdminSummaryQuerySchema = z.object({}).strict();
