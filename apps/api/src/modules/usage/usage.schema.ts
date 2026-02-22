import { z } from "zod";

export const addOnTypeSchema = z.enum([
  "EXTRA_USER",
  "EXTRA_PRODUCT",
  "EXTRA_LOCATION",
  "EXTRA_MEMBER",
  "EXTRA_CATEGORY",
  "EXTRA_CONTACT",
]);

export const requestAddOnSchema = z.object({
  type: addOnTypeSchema,
  quantity: z.coerce.number().int().min(1).optional(),
  notes: z.string().trim().min(1).optional(),
});

export const usageResourceParamsSchema = z.object({
  resource: z.enum([
    "users",
    "products",
    "locations",
    "members",
    "categories",
    "contacts",
  ]),
});
