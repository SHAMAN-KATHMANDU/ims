import { z } from "zod";

const TransferItemSchema = z.object({
  variationId: z.string().uuid("Invalid variation ID"),
  subVariationId: z.string().uuid().nullable().optional(),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
});

export const CreateTransferSchema = z
  .object({
    fromLocationId: z.string().uuid("Invalid source location ID"),
    toLocationId: z.string().uuid("Invalid destination location ID"),
    items: z
      .array(TransferItemSchema)
      .min(1, "At least one item is required for transfer"),
    notes: z.string().max(1000).optional(),
  })
  .refine((data) => data.fromLocationId !== data.toLocationId, {
    message: "Source and destination cannot be the same",
    path: ["toLocationId"],
  });

export type CreateTransferDto = z.infer<typeof CreateTransferSchema>;

export const TransferStatusEnum = z.enum([
  "PENDING",
  "APPROVED",
  "IN_TRANSIT",
  "COMPLETED",
  "CANCELLED",
]);
export type TransferStatus = z.infer<typeof TransferStatusEnum>;

/**
 * Sort fields accepted by `getPrismaOrderBy` (flat Prisma model keys on `Transfer`).
 *
 * **Relation sorts (not in this list):** `fromLocationName` and `toLocationName` are valid
 * `sortBy` query values (see transfer router Swagger) but map to nested orderBy
 * `{ fromLocation: { name } }` / `{ toLocation: { name } }` in `TransferService.findAll`
 * because `getPrismaOrderBy` only emits top-level field keys.
 */
export const ALLOWED_SORT_FIELDS = [
  "id",
  "transferCode",
  "status",
  "createdAt",
  "approvedAt",
  "completedAt",
] as const;

export const GetAllTransfersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.string().optional().default("createdAt"),
  sortOrder: z
    .string()
    .optional()
    .transform((v) => (v?.toLowerCase() === "desc" ? "desc" : "asc")),
  search: z.string().trim().optional().default(""),
  status: TransferStatusEnum.optional(),
  fromLocationId: z.string().uuid().optional(),
  toLocationId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  dateFrom: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? new Date(v) : undefined)),
  dateTo: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? new Date(v) : undefined)),
});

export type GetAllTransfersQuery = z.infer<typeof GetAllTransfersQuerySchema>;

export const CancelTransferSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type CancelTransferDto = z.infer<typeof CancelTransferSchema>;
