import { z } from "zod";

const trashEntityTypeSchema = z.preprocess(
  (value) => {
    if (typeof value === "string") {
      return value.toLowerCase();
    }
    return value;
  },
  z.enum([
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
  ]),
);

export const trashListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  entityType: trashEntityTypeSchema.optional(),
});

export const trashEntityParamsSchema = z.object({
  entityType: trashEntityTypeSchema,
  id: z.string().trim().min(1, "id is required"),
});
