import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Nav bar — logo · menu · search · cart (header global).
 */
export interface NavBarProps {
  brand: string;
  brandHref?: string;
  brandStyle?: "serif" | "sans" | "mono";
  items?: Array<{
    label: string;
    href: string;
    hasMegaMenu?: boolean;
  }>;
  showSearch?: boolean;
  showCart?: boolean;
  showAccount?: boolean;
  cartCount?: number;
  sticky?: boolean;
  align?: "between" | "center";
}

/**
 * Zod schema for nav-bar props validation.
 */
export const NavBarSchema = z
  .object({
    brand: str(100),
    brandHref: optStr(500),
    brandStyle: z.enum(["serif", "sans", "mono"]).optional(),
    items: z
      .array(
        z
          .object({
            label: str(100),
            href: str(500),
            hasMegaMenu: z.boolean().optional(),
          })
          .strict(),
      )
      .optional(),
    showSearch: z.boolean().optional(),
    showCart: z.boolean().optional(),
    showAccount: z.boolean().optional(),
    cartCount: z.number().int().nonnegative().optional(),
    sticky: z.boolean().optional(),
    align: z.enum(["between", "center"]).optional(),
  })
  .strict();

export type NavBarInput = z.infer<typeof NavBarSchema>;
