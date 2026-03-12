import { z } from "zod";

const PAYMENT_METHOD = z.enum(["CASH", "CARD", "CHEQUE", "FONEPAY", "QR"]);

const SALE_ITEM_SCHEMA = z.object({
  variationId: z.string().uuid("Invalid variation ID"),
  subVariationId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().positive("Quantity must be positive"),
  discountId: z.string().uuid().nullable().optional(),
  promoCode: z.string().optional(),
});

export const CreateSaleSchema = z.object({
  locationId: z.string().uuid("Location ID is required"),
  memberPhone: z.string().optional(),
  memberName: z.string().optional(),
  contactId: z.string().uuid().optional().nullable(),
  isCreditSale: z.boolean().optional(),
  items: z.array(SALE_ITEM_SCHEMA).min(1, "At least one item is required"),
  notes: z.string().optional(),
  payments: z
    .array(
      z.object({
        method: PAYMENT_METHOD,
        amount: z.number().min(0),
      }),
    )
    .optional(),
});

export type CreateSaleDto = z.infer<typeof CreateSaleSchema>;

export const PreviewSaleSchema = z.object({
  locationId: z.string().uuid("Location ID is required"),
  memberPhone: z.string().optional(),
  memberName: z.string().optional(),
  contactId: z.string().uuid().optional().nullable(),
  items: z.array(SALE_ITEM_SCHEMA).min(1, "At least one item is required"),
});

export type PreviewSaleDto = z.infer<typeof PreviewSaleSchema>;

export const AddPaymentSchema = z.object({
  method: PAYMENT_METHOD,
  amount: z.number().positive("Amount must be a positive number"),
});

export type AddPaymentDto = z.infer<typeof AddPaymentSchema>;

export const GetAllSalesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
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
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  search: z.string().optional(),
  locationId: z.string().uuid().optional(),
  createdById: z.string().uuid().optional(),
  type: z.enum(["GENERAL", "MEMBER"]).optional(),
  isCreditSale: z
    .string()
    .optional()
    .transform((v) =>
      v === "true" ? true : v === "false" ? false : undefined,
    ),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type GetAllSalesQueryDto = z.infer<typeof GetAllSalesQuerySchema>;

export const GetSalesSummaryQuerySchema = z.object({
  locationId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type GetSalesSummaryQueryDto = z.infer<
  typeof GetSalesSummaryQuerySchema
>;

export const GetSalesByLocationQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type GetSalesByLocationQueryDto = z.infer<
  typeof GetSalesByLocationQuerySchema
>;

export const GetDailySalesQuerySchema = z.object({
  locationId: z.string().uuid().optional(),
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
});

export type GetDailySalesQueryDto = z.infer<typeof GetDailySalesQuerySchema>;

export const DownloadSalesQuerySchema = z.object({
  format: z.enum(["excel", "csv"]).optional().default("excel"),
  ids: z.string().optional(),
});

export type DownloadSalesQueryDto = z.infer<typeof DownloadSalesQuerySchema>;

export const GetMySalesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
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
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  locationId: z.string().uuid().optional(),
  type: z.enum(["GENERAL", "MEMBER"]).optional(),
  isCreditSale: z
    .string()
    .optional()
    .transform((v) =>
      v === "true" ? true : v === "false" ? false : undefined,
    ),
});

export type GetMySalesQueryDto = z.infer<typeof GetMySalesQuerySchema>;

export const DeleteSaleSchema = z.object({
  deleteReason: z.string().max(500).optional().nullable(),
});

export type DeleteSaleDto = z.infer<typeof DeleteSaleSchema>;

export const EditSaleSchema = z.object({
  items: z.array(SALE_ITEM_SCHEMA).min(1, "At least one item is required"),
  notes: z.string().optional(),
  payments: z
    .array(
      z.object({
        method: PAYMENT_METHOD,
        amount: z.number().min(0),
      }),
    )
    .optional(),
  editReason: z.string().max(500).optional().nullable(),
});

export type EditSaleDto = z.infer<typeof EditSaleSchema>;
