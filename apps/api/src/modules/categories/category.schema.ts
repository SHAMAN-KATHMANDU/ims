import { z } from "zod";

const optionalTrimmedString = z.string().trim().min(1).optional();

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  description: z.string().trim().optional(),
});

export const updateCategorySchema = z.object({
  name: optionalTrimmedString,
  description: z.string().trim().optional().nullable(),
});

export const categorySubcategorySchema = z.object({
  name: z.string().trim().min(1, "Subcategory name is required"),
});

export const categoryIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Category ID is required"),
});

export const categoryListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(["id", "name", "createdAt", "updatedAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});
