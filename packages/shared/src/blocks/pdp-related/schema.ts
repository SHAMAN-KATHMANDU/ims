import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * PDP related — you may also like section.
 */
export interface PdpRelatedProps {
  heading?: string;
  limit: number;
  columns: 2 | 3 | 4;
}

/**
 * Zod schema for pdp-related props validation.
 */
export const PdpRelatedSchema = z
  .object({
    heading: optStr(200),
    limit: z.number().int().min(1).max(12),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  })
  .strict();

export type PdpRelatedInput = z.infer<typeof PdpRelatedSchema>;
