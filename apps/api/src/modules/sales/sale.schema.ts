import { z } from "zod";

const paymentMethodSchema = z.enum(["CASH", "CARD", "CHEQUE", "FONEPAY", "QR"]);
const saleTypeSchema = z.enum(["GENERAL", "MEMBER"]);

const queryBooleanSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    if (value === "true" || value === "1") return true;
    if (value === "false" || value === "0") return false;
  }
  return value;
}, z.boolean());

const saleItemSchema = z.object({
  variationId: z.string().trim().min(1, "variationId is required"),
  subVariationId: z.string().trim().min(1).nullable().optional(),
  quantity: z.coerce.number().int().positive("quantity must be greater than 0"),
  promoCode: z.string().trim().min(1).optional(),
});

export const createSaleSchema = z.object({
  locationId: z.string().trim().min(1, "Location ID is required"),
  memberPhone: z.string().trim().optional(),
  memberName: z.string().trim().optional(),
  isCreditSale: z.boolean().optional(),
  items: z.array(saleItemSchema).min(1, "At least one item is required"),
  notes: z.string().trim().optional(),
  payments: z
    .array(
      z.object({
        method: paymentMethodSchema,
        amount: z.coerce.number().positive(),
      }),
    )
    .optional(),
});

export const previewSaleSchema = z.object({
  locationId: z.string().trim().min(1, "locationId is required"),
  memberPhone: z.string().trim().optional(),
  memberName: z.string().trim().optional(),
  items: z.array(saleItemSchema).min(1, "items must be a non-empty array"),
});

export const addSalePaymentSchema = z.object({
  method: paymentMethodSchema,
  amount: z.coerce.number().positive("Amount must be a positive number"),
});

export const saleIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Sale ID is required"),
});

export const salesListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  locationId: z.string().trim().optional(),
  createdById: z.string().trim().optional(),
  type: saleTypeSchema.optional(),
  isCreditSale: queryBooleanSchema.optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  search: z.string().trim().optional(),
  sortBy: z
    .enum([
      "createdAt",
      "total",
      "subtotal",
      "discount",
      "saleCode",
      "type",
      "id",
    ])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const salesSinceLoginQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
});

export const salesSummaryQuerySchema = z.object({
  locationId: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
});

export const salesByLocationQuerySchema = z.object({
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
});

export const salesDailyQuerySchema = z.object({
  locationId: z.string().trim().optional(),
  days: z.coerce.number().int().min(1).optional(),
});
