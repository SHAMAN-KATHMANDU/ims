/**
 * Plan limits feature Zod schemas.
 */

import { z } from "zod";

export const PlanLimitsQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
});

export type PlanLimitsQueryInput = z.infer<typeof PlanLimitsQuerySchema>;
