/**
 * Locations feature Zod schemas.
 */

import { z } from "zod";

export const LocationTypeSchema = z.enum(["WAREHOUSE", "SHOWROOM"]);

export const CreateLocationSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  type: LocationTypeSchema.optional().default("SHOWROOM"),
  address: z.string().max(500).optional().default(""),
  isDefaultWarehouse: z.boolean().optional().default(false),
});

export const UpdateLocationSchema = CreateLocationSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateLocationInput = z.infer<typeof CreateLocationSchema>;
export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>;
