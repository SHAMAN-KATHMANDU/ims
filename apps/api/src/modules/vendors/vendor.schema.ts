import { z } from "zod";

const optionalTrimmedString = z.string().trim().optional();

export const createVendorSchema = z.object({
  name: z.string().trim().min(1, "Vendor name is required"),
  contact: optionalTrimmedString,
  phone: optionalTrimmedString,
  address: optionalTrimmedString,
});

export const updateVendorSchema = z.object({
  name: z.string().trim().min(1).optional(),
  contact: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
});

export const vendorIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Vendor ID is required"),
});

export const vendorListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(["id", "name", "createdAt", "updatedAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const vendorProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  search: z.string().trim().optional(),
});
