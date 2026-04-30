/**
 * Tenant-scoped site management schemas.
 *
 * These endpoints let tenant admins customize their own website content.
 * Platform-level concerns (enabling the feature, assigning domains) live in
 * platform-websites / platform-domains.
 */

import { z } from "zod";
import {
  BlockNodeSchema,
  BlockTreeSchema,
  SiteLayoutScopeSchema,
} from "@repo/shared";

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

// ——— PAGES ———

export const CreatePageSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200),
  scope: SiteLayoutScopeSchema,
  seo: z
    .object({
      title: z.string().trim().max(200).optional(),
      description: z.string().trim().max(500).optional(),
      ogImage: z.string().trim().max(1000).optional(),
      noindex: z.boolean().optional(),
    })
    .optional(),
});

export const UpdatePageSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  slug: z.string().trim().min(1).max(200).optional(),
  seo: z
    .object({
      title: z.string().trim().max(200).optional(),
      description: z.string().trim().max(500).optional(),
      ogImage: z.string().trim().max(1000).optional(),
      noindex: z.boolean().optional(),
    })
    .optional(),
});

// ——— BLOCKS ———

export const UpsertBlocksSchema = z.object({
  pageId: z.string().trim().min(1).optional().nullable(),
  scope: SiteLayoutScopeSchema.optional(),
  blocks: BlockTreeSchema,
});

export const AddBlockSchema = z.object({
  block: BlockNodeSchema,
});

export const UpdateBlockSchema = z.object({
  blockId: z.string().trim().min(1),
  props: z.record(z.unknown()).optional(),
  style: jsonObject,
  visibility: z
    .object({
      desktop: z.boolean().optional(),
      tablet: z.boolean().optional(),
      mobile: z.boolean().optional(),
    })
    .optional(),
});

export const ReorderBlocksSchema = z.object({
  blockIds: z.array(z.string().min(1)).min(1),
});

// ——— GLOBALS (Header/Footer) ———

export const UpdateGlobalsSchema = z.object({
  header: BlockTreeSchema.optional(),
  footer: BlockTreeSchema.optional(),
});

// ——— THEME ———

export const UpdateThemeSchema = z.object({
  colors: z
    .object({
      primary: z.string().optional(),
      accent: z.string().optional(),
      secondary: z.string().optional(),
      background: z.string().optional(),
      surface: z.string().optional(),
      text: z.string().optional(),
      muted: z.string().optional(),
      border: z.string().optional(),
    })
    .optional(),
  typography: z
    .object({
      headingFont: z.string().optional(),
      bodyFont: z.string().optional(),
      baseSize: z.number().int().min(10).max(32).optional(),
      typeScale: z.number().min(1).max(2).optional(),
    })
    .optional(),
  layout: z
    .object({
      containerWidth: z.number().int().min(300).max(2000).optional(),
      sectionPadding: z.string().optional(),
      radiusPx: z.number().int().min(0).max(50).optional(),
      buttonStyle: z.enum(["solid", "outline", "pill"]).optional(),
    })
    .optional(),
});

// ——— SEO ———

export const UpdateSeoSchema = z.object({
  siteTitle: z.string().trim().max(200).optional(),
  siteDescription: z.string().trim().max(500).optional(),
  gaId: z.string().trim().max(100).optional(),
  robots: z.string().trim().max(1000).optional(),
});

// ——— ANALYTICS ———

/**
 * Analytics tracker IDs stored in SiteConfig.analytics.
 * Only injected server-side on published tenant sites; never on /preview/* routes.
 */
export const AnalyticsSchema = z.object({
  ga4MeasurementId: z
    .string()
    .trim()
    .regex(/^G-[A-Z0-9]+$/, "Must be in G-XXXXXXXX format (e.g. G-XXXXXXXXXX)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  gtmContainerId: z
    .string()
    .trim()
    .regex(/^GTM-[A-Z0-9]+$/, "Must be in GTM-XXXXXX format (e.g. GTM-XXXXXX)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  metaPixelId: z
    .string()
    .trim()
    .regex(/^[0-9]{6,20}$/, "Must be a 6–20 digit numeric ID")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  consentMode: z.enum(["basic", "granted"]).optional().default("basic"),
});

// ——— INFERRED TYPES ———

export type UpdateSiteConfigInput = z.infer<typeof UpdateSiteConfigSchema>;
export type PickTemplateInput = z.infer<typeof PickTemplateSchema>;
export type CreatePageInput = z.infer<typeof CreatePageSchema>;
export type UpdatePageInput = z.infer<typeof UpdatePageSchema>;
export type UpsertBlocksInput = z.infer<typeof UpsertBlocksSchema>;
export type AddBlockInput = z.infer<typeof AddBlockSchema>;
export type UpdateBlockInput = z.infer<typeof UpdateBlockSchema>;
export type ReorderBlocksInput = z.infer<typeof ReorderBlocksSchema>;
export type UpdateGlobalsInput = z.infer<typeof UpdateGlobalsSchema>;
export type UpdateThemeInput = z.infer<typeof UpdateThemeSchema>;
export type UpdateSeoInput = z.infer<typeof UpdateSeoSchema>;
export type AnalyticsInput = z.infer<typeof AnalyticsSchema>;
