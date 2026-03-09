import { z } from "zod";

/** Optional body for DELETE endpoints — reason for logging. */
export const DeleteBodySchema = z
  .object({
    reason: z.string().max(500).optional(),
  })
  .optional()
  .default({});

export type DeleteBodyDto = z.infer<typeof DeleteBodySchema>;
