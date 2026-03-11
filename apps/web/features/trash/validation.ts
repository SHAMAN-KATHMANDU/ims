/**
 * Trash feature Zod schemas.
 */

import { z } from "zod";

export const RestoreFromTrashSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "At least one ID required"),
});

export const PermanentDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "At least one ID required"),
});

export type RestoreFromTrashInput = z.infer<typeof RestoreFromTrashSchema>;
export type PermanentDeleteInput = z.infer<typeof PermanentDeleteSchema>;
