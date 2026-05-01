import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Footer columns — 2–6 link columns + brand.
 */
export interface FooterColumnsProps {
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
