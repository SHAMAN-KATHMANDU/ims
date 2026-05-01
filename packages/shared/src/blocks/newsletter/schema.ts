import { z } from "zod";

const optStr = (max: number) => z.string().trim().max(max).optional();

/**
 * Newsletter props — email capture band.
 */
export interface NewsletterProps {
  title?: string;
  subtitle?: string;
  cta?: string;
  variant?: "inline" | "card" | "banner" | "modal";
  dark?: boolean;
  /** Modal-only: seconds before first auto-open (0 disables auto-open). */
  modalDelaySeconds?: number;
  /** Modal-only: show on exit-intent (desktop). */
  modalExitIntent?: boolean;
}

/**
 * Zod schema for newsletter props validation.
 */
export const NewsletterSchema = z
  .object({
    title: optStr(200),
    subtitle: optStr(400),
    cta: optStr(40),
    variant: z.enum(["inline", "card", "banner", "modal"]).optional(),
    dark: z.boolean().optional(),
    modalDelaySeconds: z.number().int().min(0).max(600).optional(),
    modalExitIntent: z.boolean().optional(),
  })
  .strict();

export type NewsletterInput = z.infer<typeof NewsletterSchema>;
