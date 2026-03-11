/**
 * Feature flags validation.
 */

import { z } from "zod";

export const FeatureFlagSchema = z.enum([
  "NEW_DASHBOARD",
  "AI_RECOMMENDATIONS",
  "ADVANCED_ANALYTICS",
  "SALES_PREDICTIONS",
  "EXPERIMENTAL_CHECKOUT",
]);

export type FeatureFlagInput = z.infer<typeof FeatureFlagSchema>;
