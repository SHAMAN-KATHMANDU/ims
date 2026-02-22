import { z } from "zod";

const transferItemSchema = z.object({
  variationId: z.string().trim().min(1, "variationId is required"),
  subVariationId: z.string().trim().min(1).nullable().optional(),
  quantity: z.coerce.number().int().positive("quantity must be greater than 0"),
});

export const createTransferSchema = z
  .object({
    fromLocationId: z.string().trim().min(1, "Source location is required"),
    toLocationId: z.string().trim().min(1, "Destination location is required"),
    items: z
      .array(transferItemSchema)
      .min(1, "At least one item is required for transfer"),
    notes: z.string().trim().optional(),
  })
  .refine((v) => v.fromLocationId !== v.toLocationId, {
    message: "Source and destination cannot be the same",
    path: ["toLocationId"],
  });

export const cancelTransferSchema = z.object({
  reason: z.string().trim().optional(),
});

export const transferIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Transfer ID is required"),
});

export const transferListQuerySchema = z.object({
  status: z
    .enum(["PENDING", "APPROVED", "IN_TRANSIT", "COMPLETED", "CANCELLED"])
    .optional(),
  fromLocationId: z.string().trim().optional(),
  toLocationId: z.string().trim().optional(),
  locationId: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  search: z.string().trim().optional(),
  sortBy: z
    .enum([
      "id",
      "transferCode",
      "status",
      "createdAt",
      "approvedAt",
      "completedAt",
    ])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});
