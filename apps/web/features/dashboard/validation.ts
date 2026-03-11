/**
 * Dashboard feature Zod schemas.
 * Dashboard is read-only; no form validation needed.
 * Placeholder for consistency with feature architecture.
 */

import { z } from "zod";

export const DashboardRefreshParamsSchema = z.object({
  invalidate: z.boolean().optional(),
});

export type DashboardRefreshParams = z.infer<
  typeof DashboardRefreshParamsSchema
>;
