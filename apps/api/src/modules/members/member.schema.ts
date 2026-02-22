import { z } from "zod";

const optionalTrimmedString = z.string().trim().min(1).optional();

export const createMemberSchema = z.object({
  phone: z.string().trim().min(1, "Phone number is required"),
  name: optionalTrimmedString,
  email: optionalTrimmedString,
  notes: optionalTrimmedString,
});

export const updateMemberSchema = z.object({
  phone: optionalTrimmedString,
  name: optionalTrimmedString.nullable(),
  email: optionalTrimmedString.nullable(),
  notes: optionalTrimmedString.nullable(),
  isActive: z.boolean().optional(),
});

export const memberIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Member ID is required"),
});

export const memberPhoneParamsSchema = z.object({
  phone: z.string().trim().min(1, "Phone number is required"),
});

export const memberListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "name", "id"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});
