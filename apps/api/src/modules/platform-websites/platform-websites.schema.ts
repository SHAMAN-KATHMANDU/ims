/**
 * Zod schemas for platform-admin website-feature management.
 * These endpoints let platformAdmins enable/disable the website feature per
 * tenant and optionally preselect a template.
 */

import { z } from "zod";

export const EnableWebsiteSchema = z.object({
  /** Optional: preselect a template (by slug) when enabling for the first time. */
  templateSlug: z.string().trim().min(1).optional(),
});

export type EnableWebsiteInput = z.infer<typeof EnableWebsiteSchema>;
