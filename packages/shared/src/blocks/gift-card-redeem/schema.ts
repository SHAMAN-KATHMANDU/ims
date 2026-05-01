import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Gift card redeem — code input and balance checker.
 */
export interface GiftCardRedeemProps {
  heading?: string;
  subtitle?: string;
  codeLabel?: string;
  amountLabel?: string;
  buttonLabel?: string;
  successMessage?: string;
  variant?: "inline" | "card";
}

/**
 * Zod schema for gift-card-redeem props validation.
 */
export const GiftCardRedeemSchema = z
  .object({
    heading: optStr(200),
    subtitle: optStr(400),
    codeLabel: optStr(80),
    amountLabel: optStr(80),
    buttonLabel: optStr(80),
    successMessage: optStr(400),
    variant: z.enum(["inline", "card"]).optional(),
  })
  .strict();

export type GiftCardRedeemInput = z.infer<typeof GiftCardRedeemSchema>;
