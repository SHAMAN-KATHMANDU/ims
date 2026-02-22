import { z } from "zod";

const optionalTrimmedString = z.string().trim().min(1).optional();

export const createCompanySchema = z.object({
  name: z.string().trim().min(1, "Company name is required"),
  website: optionalTrimmedString,
  address: optionalTrimmedString,
  phone: optionalTrimmedString,
});

export const updateCompanySchema = z.object({
  name: optionalTrimmedString,
  website: optionalTrimmedString.nullable(),
  address: optionalTrimmedString.nullable(),
  phone: optionalTrimmedString.nullable(),
});

export const companyListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "name", "id"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const companyIdParamsSchema = z.object({
  id: z.string().uuid("Invalid company id"),
});
