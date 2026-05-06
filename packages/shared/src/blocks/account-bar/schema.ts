import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Account bar — a slim bar above the nav, primarily for B2B / wholesale
 * stores: shows logged-in account number, tier badge, and PO entry. The
 * renderer hides itself for guests unless a fallback `guestText` is set.
 */
export interface AccountBarProps {
  /** Show the customer's account number (B2B). */
  showAccountNumber?: boolean;
  /** Show the customer's pricing tier (B2B). */
  showTier?: boolean;
  /** Show a "Reference / PO" inline input. */
  showPo?: boolean;
  /** Layout: items packed on the left vs space-between. */
  alignment?: "start" | "between";
  /** "default" matches surface; "contrast" inverts to text-on-primary. */
  tone?: "default" | "contrast";
  /** Optional copy shown when no viewer is logged in (else hidden). */
  guestText?: string;
}

export const AccountBarSchema = z
  .object({
    showAccountNumber: z.boolean().optional(),
    showTier: z.boolean().optional(),
    showPo: z.boolean().optional(),
    alignment: z.enum(["start", "between"]).optional(),
    tone: z.enum(["default", "contrast"]).optional(),
    guestText: optStr(200),
  })
  .strict();

export type AccountBarInput = z.infer<typeof AccountBarSchema>;
