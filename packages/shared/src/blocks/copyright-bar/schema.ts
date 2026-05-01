import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Copyright bar — bottom © line + links.
 */
export interface CopyrightBarProps {
  copy: string;
  showLinks?: boolean;
  items?: Array<{
    label: string;
    href: string;
  }>;
}

/**
 * Zod schema for copyright-bar props validation.
 */
export const CopyrightBarSchema = z
  .object({
    copy: str(500),
    showLinks: z.boolean().optional(),
    items: z
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
  .strict();

export type CopyrightBarInput = z.infer<typeof CopyrightBarSchema>;
