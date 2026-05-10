import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Footer columns — 2–6 link columns + brand.
 *
 * `variant` switches the visual layout while preserving the same data
 * contract — a tenant can swap between "standard / minimal / dark /
 * centered" without rewriting their columns.
 *
 * Variants:
 *   - standard  (default): brand-left, columns-right grid.
 *   - minimal: brand row above a single horizontal link bar; no column titles.
 *   - dark: standard layout with inverted background + light text.
 *   - centered: brand centered above evenly-distributed columns.
 */
export type FooterColumnsVariant = "standard" | "minimal" | "dark" | "centered";

export interface FooterColumnsProps {
  variant?: FooterColumnsVariant;
  showBrand?: boolean;
  brand?: string;
  tagline?: string;
  columns?: Array<{
    title: string;
    links?: Array<{
      label: string;
      href: string;
    }>;
  }>;
}

/**
 * Zod schema for footer-columns props validation.
 */
export const FooterColumnsSchema = z
  .object({
    variant: z.enum(["standard", "minimal", "dark", "centered"]).optional(),
    showBrand: z.boolean().optional(),
    brand: optStr(100),
    tagline: optStr(500),
    columns: z
      .array(
        z
          .object({
            title: str(100),
            links: z
              .array(
                z
                  .object({
                    label: str(100),
                    href: str(500),
                  })
                  .strict(),
              )
              .optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

export type FooterColumnsInput = z.infer<typeof FooterColumnsSchema>;
