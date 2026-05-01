import { z } from "zod";

/**
 * Breadcrumbs props — navigation trail.
 */
export interface BreadcrumbsProps {
  scope: "product" | "category" | "page";
}

/**
 * Zod schema for breadcrumbs props validation.
 */
export const BreadcrumbsSchema = z
  .object({ scope: z.enum(["product", "category", "page"]) })
  .strict();

export type BreadcrumbsInput = z.infer<typeof BreadcrumbsSchema>;
