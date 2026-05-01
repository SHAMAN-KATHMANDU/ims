import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Logo mark — standalone brand mark.
 */
export interface LogoMarkProps {
  brand: string;
  href?: string;
  subtitle?: string;
  align?: "start" | "center" | "end";
  variant?: "text-only" | "with-icon";
}

/**
 * Zod schema for logo-mark props validation.
 */
export const LogoMarkSchema = z
  .object({
    brand: str(100),
    href: optStr(500),
    subtitle: optStr(100),
    align: z.enum(["start", "center", "end"]).optional(),
    variant: z.enum(["text-only", "with-icon"]).optional(),
  })
  .strict();

export type LogoMarkInput = z.infer<typeof LogoMarkSchema>;
