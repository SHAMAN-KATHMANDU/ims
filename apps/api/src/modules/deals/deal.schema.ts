import { z } from "zod";

const optionalTrimmedString = z.string().trim().min(1).optional();
const optionalNullableTrimmedString = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .optional();

const dealStatusSchema = z.enum(["OPEN", "WON", "LOST"]);

export const createDealSchema = z.object({
  name: z.string().trim().min(1, "Deal name is required"),
  value: z.coerce.number().optional(),
  stage: optionalTrimmedString,
  probability: z.coerce.number().min(0).max(100).optional(),
  status: dealStatusSchema.optional(),
  expectedCloseDate: z.string().datetime().nullable().optional(),
  contactId: optionalNullableTrimmedString,
  memberId: optionalNullableTrimmedString,
  companyId: optionalNullableTrimmedString,
  pipelineId: optionalNullableTrimmedString,
  assignedToId: optionalTrimmedString,
});

export const updateDealSchema = z.object({
  name: optionalTrimmedString,
  value: z.coerce.number().optional(),
  stage: optionalTrimmedString,
  probability: z.coerce.number().min(0).max(100).optional(),
  status: dealStatusSchema.optional(),
  expectedCloseDate: z.string().datetime().nullable().optional(),
  closedAt: z.string().datetime().nullable().optional(),
  lostReason: optionalNullableTrimmedString,
  contactId: optionalNullableTrimmedString,
  memberId: optionalNullableTrimmedString,
  companyId: optionalNullableTrimmedString,
  assignedToId: optionalTrimmedString,
});

export const updateDealStageSchema = z.object({
  stage: z.string().trim().min(1, "Stage is required"),
});

export const dealIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Deal ID is required"),
});

export const dealListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  search: z.string().trim().optional(),
  sortBy: z
    .enum([
      "createdAt",
      "updatedAt",
      "name",
      "value",
      "expectedCloseDate",
      "id",
    ])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  pipelineId: z.string().trim().optional(),
  stage: z.string().trim().optional(),
  status: dealStatusSchema.optional(),
  assignedToId: z.string().trim().optional(),
});

export const dealPipelineQuerySchema = z.object({
  pipelineId: z.string().trim().optional(),
});
