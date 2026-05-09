/**
 * Template custom pages schema — Zod validation for defaultPages in TemplateBlueprint.
 *
 * When a template is applied, each entry in defaultPages becomes a TenantPage
 * with kind="page" and a corresponding SiteLayout with the page's blocks.
 */

import { z } from "zod";
import { BlockNodeSchema, type BlockNode } from "./blocks";

/**
 * A custom page defined in a template's defaultPages array.
 *
 * When applied, this creates a TenantPage row and a SiteLayout row tied to it.
 */
export interface TemplatePageDefinition {
  slug: string; // URL-safe identifier; must be unique within tenant
  title: string; // Display name for the Pages list
  blocks?: BlockNode[]; // Layout blocks; defaults to empty array if omitted
  navOrder?: number; // Sort order in Pages list (within custom pages); defaults to 0
  description?: string; // Short description for page list metadata
  meta?: {
    seoTitle?: string;
    seoDescription?: string;
  };
}

export const TemplatePageDefinitionSchema: z.ZodType<TemplatePageDefinition> =
  z.object({
    slug: z
      .string()
      .min(1, "Slug required")
      .max(80, "Slug too long")
      .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric + hyphens"),
    title: z.string().min(1, "Title required").max(200, "Title too long"),
    blocks: z.array(BlockNodeSchema).optional(),
    navOrder: z.number().int().min(0).optional(),
    description: z.string().max(500).optional(),
    meta: z
      .object({
        seoTitle: z.string().max(200).optional(),
        seoDescription: z.string().max(500).optional(),
      })
      .strict()
      .optional(),
  }) as unknown as z.ZodType<TemplatePageDefinition>;

/**
 * Array of custom pages in a template.
 */
export type TemplatePageDefinitions = TemplatePageDefinition[];

export const TemplatePageDefinitionsSchema = z.array(
  TemplatePageDefinitionSchema,
);
