/**
 * Tenant-scoped site management schemas.
 *
 * These endpoints let tenant admins customize their own website content.
 * Platform-level concerns (enabling the feature, assigning domains) live in
 * platform-websites / platform-domains.
 */

import { z } from "zod";

/** Free-form JSON payload (object or null). */
const jsonObject = z.record(z.unknown()).nullable().optional();

/**
 * ISO-4217-style currency code. We don't enforce the full ISO-4217
 * whitelist here because some tenants run in markets where the list
 * changes faster than our deploys ("ZWL"/"ZWG" history, pegged/retired
 * codes, etc.). Instead we keep the shape light: 3–8 chars, uppercase
 * letters/digits. The DB column is VARCHAR(8) so this also matches the
 * storage bound.
 */
const CurrencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{3,8}$/, "Currency must be 3–8 uppercase letters/digits")
  .optional();

export const UpdateSiteConfigSchema = z
  .object({
    branding: jsonObject,
    contact: jsonObject,
    features: jsonObject,
    seo: jsonObject,
    themeTokens: jsonObject,
    currency: CurrencyCode,
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  });

export const PickTemplateSchema = z.object({
  templateSlug: z.string().trim().min(1),
  /**
   * When true, re-apply the template's defaultBranding + defaultSections,
   * overwriting the tenant's current branding/features. Defaults to false so
   * tenants don't lose customizations by accident when switching.
   */
  resetBranding: z.boolean().optional().default(false),
});

export type UpdateSiteConfigInput = z.infer<typeof UpdateSiteConfigSchema>;
export type PickTemplateInput = z.infer<typeof PickTemplateSchema>;
