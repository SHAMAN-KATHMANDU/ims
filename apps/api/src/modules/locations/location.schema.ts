import { z } from "zod";

export const LOCATION_TYPE = ["WAREHOUSE", "SHOWROOM"] as const;

export const CreateLocationSchema = z.object({
  name: z.string().min(1, "Location name is required").max(255),
  type: z.enum(LOCATION_TYPE).default("SHOWROOM"),
  address: z.string().max(2000).optional(),
  isDefaultWarehouse: z.boolean().optional(),
});

export const UpdateLocationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.enum(LOCATION_TYPE).optional(),
  address: z.string().max(2000).nullable().optional(),
  isActive: z.boolean().optional(),
  isDefaultWarehouse: z.boolean().optional(),
});

export type CreateLocationDto = z.infer<typeof CreateLocationSchema>;
export type UpdateLocationDto = z.infer<typeof UpdateLocationSchema>;
