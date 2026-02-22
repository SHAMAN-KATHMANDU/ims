import { z } from "zod";

const optionalTrimmedString = z.string().trim().min(1).optional();

export const leadStatusSchema = z.enum([
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "LOST",
  "CONVERTED",
]);

export const createLeadSchema = z.object({
  name: z.string().trim().min(1, "Lead name is required"),
  email: optionalTrimmedString,
  phone: optionalTrimmedString,
  companyName: optionalTrimmedString,
  status: leadStatusSchema.optional(),
  source: optionalTrimmedString,
  notes: optionalTrimmedString,
  assignedToId: z.string().trim().min(1).optional(),
});

export const updateLeadSchema = z.object({
  name: optionalTrimmedString,
  email: optionalTrimmedString.nullable(),
  phone: optionalTrimmedString.nullable(),
  companyName: optionalTrimmedString.nullable(),
  status: leadStatusSchema.optional(),
  source: optionalTrimmedString.nullable(),
  notes: optionalTrimmedString.nullable(),
  assignedToId: z.string().trim().min(1).optional(),
});

export const assignLeadSchema = z.object({
  assignedToId: z.string().trim().min(1, "assignedToId is required"),
});

export const leadIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Lead ID is required"),
});

export const leadListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "name", "status", "id"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  status: leadStatusSchema.optional(),
  source: z.string().trim().optional(),
  assignedToId: z.string().trim().optional(),
});

export type LeadStatus = z.infer<typeof leadStatusSchema>;
