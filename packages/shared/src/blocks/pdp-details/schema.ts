import { z } from "zod";

/**
 * PDP details — product description block.
 */
export interface PdpDetailsProps {
  tabs?: boolean;
}

/**
 * Zod schema for pdp-details props validation.
 */
export const PdpDetailsSchema = z
  .object({ tabs: z.boolean().optional() })
  .strict();

export type PdpDetailsInput = z.infer<typeof PdpDetailsSchema>;
