import { z } from "zod";

export const CreateDealSchema = z.object({
  name: z.string().min(1, "Deal name is required").max(255),
  value: z.number().min(0).default(0),
  stage: z.string().optional(),
  probability: z
    .number()
    .min(0, "Probability must be at least 0")
    .max(100, "Probability must be between 0 and 100")
    .optional(),
  expectedCloseDate: z.string().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  memberId: z.string().uuid().optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  pipelineId: z.string().uuid().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
});

export const UpdateDealSchema = CreateDealSchema.partial().extend({
  status: z.enum(["OPEN", "WON", "LOST"]).optional(),
  lostReason: z.string().optional().nullable(),
  closedAt: z.string().optional().nullable(),
  editReason: z.string().max(500).optional().nullable(),
});

export const UpdateDealStageSchema = z.object({
  stage: z.string().min(1, "Stage is required"),
});

export const AddDealLineItemSchema = z.object({
  productId: z.string().uuid(),
  variationId: z.string().uuid().optional().nullable(),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0).default(0),
});

export const ConvertDealToSaleSchema = z.object({
  locationId: z.string().uuid(),
});

export type CreateDealDto = z.infer<typeof CreateDealSchema>;
export type UpdateDealDto = z.infer<typeof UpdateDealSchema>;
export type UpdateDealStageDto = z.infer<typeof UpdateDealStageSchema>;
export type AddDealLineItemDto = z.infer<typeof AddDealLineItemSchema>;
export type ConvertDealToSaleDto = z.infer<typeof ConvertDealToSaleSchema>;
