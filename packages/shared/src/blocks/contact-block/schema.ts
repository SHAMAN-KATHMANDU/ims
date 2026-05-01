import { z } from "zod";

const optStr = (max: number) => z.string().trim().max(max).optional();

/**
 * Contact block props — email / phone / address.
 */
export interface ContactBlockProps {
  heading?: string;
  layout?: "centered" | "split";
  showMap?: boolean;
  showSocials?: boolean;
}

/**
 * Zod schema for contact-block props validation.
 */
export const ContactBlockSchema = z
  .object({
    heading: optStr(200),
    layout: z.enum(["centered", "split"]).optional(),
    showMap: z.boolean().optional(),
    showSocials: z.boolean().optional(),
  })
  .strict();

export type ContactBlockInput = z.infer<typeof ContactBlockSchema>;
