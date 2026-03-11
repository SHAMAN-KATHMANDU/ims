/**
 * Onboarding feature Zod schemas.
 */

import { z } from "zod";

export const OnboardingStepSchema = z.enum([
  "welcome",
  "workspace",
  "location",
  "product",
  "complete",
]);

export const OnboardingProgressSchema = z.object({
  currentStep: OnboardingStepSchema,
  completedSteps: z.array(OnboardingStepSchema).optional(),
});

export type OnboardingStepInput = z.infer<typeof OnboardingStepSchema>;
