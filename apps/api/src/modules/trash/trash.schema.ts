import { z } from "zod";

/** Valid entity types for trash operations (lowercase). */
const VALID_ENTITY_TYPES = [
  "product",
  "category",
  "subcategory",
  "vendor",
  "member",
  "location",
  "promocode",
  "company",
  "contact",
  "lead",
  "deal",
  "task",
  "activity",
  "pipeline",
] as const;

const entityTypeEnum = z
  .string()
  .transform((s) => s?.toLowerCase().trim())
  .refine(
    (s) =>
      VALID_ENTITY_TYPES.includes(s as (typeof VALID_ENTITY_TYPES)[number]),
    {
      message: `entityType must be one of: ${VALID_ENTITY_TYPES.join(", ")}`,
    },
  );

/** Query params for listing trash items (platform admin only). */
export const ListTrashQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  entityType: entityTypeEnum.optional(),
  tenantId: z.string().uuid().optional(),
});

export type ListTrashQuery = z.infer<typeof ListTrashQuerySchema>;

/** Path params for restore and permanently delete. */
export const RestoreItemParamsSchema = z.object({
  entityType: entityTypeEnum,
  id: z.string().uuid("id must be a valid UUID"),
});

export const PermanentlyDeleteParamsSchema = z.object({
  entityType: entityTypeEnum,
  id: z.string().uuid("id must be a valid UUID"),
});

export type RestoreItemParams = z.infer<typeof RestoreItemParamsSchema>;
export type PermanentlyDeleteParams = z.infer<
  typeof PermanentlyDeleteParamsSchema
>;
