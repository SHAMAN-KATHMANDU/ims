import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Announcement bar props — top-of-page strip (shipping, launch, promo).
 */
export interface AnnouncementBarProps {
  text: string;
  link?: string;
  marquee: boolean;
  tone?: "default" | "muted" | "accent";
  /**
   * Optional repeating strip of short claims (e.g. "Across Qatar ·
   * Exclusive Brands · Scheduled Delivery"). When non-empty, `items`
   * takes precedence over `text` in the rendered marquee.
   */
  items?: string[];
  /**
   * Presentation: "bar" (default) renders as a top strip; "modal"
   * renders as a dismissible promo popup with a larger CTA. Modal
   * dismissal is persisted in localStorage.
   */
  mode?: "bar" | "modal";
  /** Modal-only: seconds before auto-open (0 = immediate). */
  modalDelaySeconds?: number;
  /** Modal-only: button label (falls back to "Shop now"). */
  modalCtaLabel?: string;
  /** Modal-only: optional heading shown above `text`. */
  modalHeading?: string;
}

/**
 * Zod schema for announcement-bar props validation.
 */
export const AnnouncementBarSchema = z
  .object({
    text: str(200),
    link: optStr(1000),
    marquee: z.boolean(),
    tone: z.enum(["default", "muted", "accent"]).optional(),
    items: z.array(str(80)).max(12).optional(),
    mode: z.enum(["bar", "modal"]).optional(),
    modalDelaySeconds: z.number().int().min(0).max(120).optional(),
    modalCtaLabel: optStr(60),
    modalHeading: optStr(120),
  })
  .strict();

export type AnnouncementBarInput = z.infer<typeof AnnouncementBarSchema>;
