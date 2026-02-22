import { z } from "zod";

const optionalTrimmedString = z.string().trim().min(1).optional();

export const createLocationSchema = z.object({
  name: z.string().trim().min(1, "Location name is required"),
  type: z.enum(["WAREHOUSE", "SHOWROOM"]).optional(),
  address: optionalTrimmedString,
  isDefaultWarehouse: z.boolean().optional(),
});

export const updateLocationSchema = z.object({
  name: optionalTrimmedString,
  type: z.enum(["WAREHOUSE", "SHOWROOM"]).optional(),
  address: z.string().trim().min(1).optional().nullable(),
  isActive: z.boolean().optional(),
  isDefaultWarehouse: z.boolean().optional(),
});

export const locationIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Location ID is required"),
});

export const locationListQuerySchema = z.object({
  type: z.enum(["WAREHOUSE", "SHOWROOM"]).optional(),
  activeOnly: z.coerce.boolean().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  search: z.string().trim().optional(),
});
