import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Empty state — placeholder for not-found / no-results.
 */
export interface EmptyStateProps {
  kind?: "not-found" | "empty-search" | "empty-cart" | "generic";
  heading: string;
  subtitle?: string;
  illustration?: "none" | "package" | "magnifier" | "cart" | "alert";
  ctaLabel?: string;
  ctaHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

/**
 * Zod schema for empty-state props validation.
 */
export const EmptyStateSchema = z
  .object({
    kind: z
      .enum(["not-found", "empty-search", "empty-cart", "generic"])
      .optional(),
    heading: str(200),
    subtitle: optStr(400),
    illustration: z
      .enum(["none", "package", "magnifier", "cart", "alert"])
      .optional(),
    ctaLabel: optStr(60),
    ctaHref: optStr(1000),
    secondaryLabel: optStr(60),
    secondaryHref: optStr(1000),
  })
  .strict();

export type EmptyStateInput = z.infer<typeof EmptyStateSchema>;
