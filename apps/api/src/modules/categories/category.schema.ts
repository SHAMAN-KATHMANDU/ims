import { z } from "zod";

export const CreateCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  description: z.string().max(500).optional(),
});

export const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});

export const CreateSubcategorySchema = z.object({
  name: z.string().min(1, "Subcategory name is required").max(100),
});

export const DeleteSubcategorySchema = z.object({
  name: z.string().min(1, "Subcategory name is required"),
});

export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof UpdateCategorySchema>;
export type CreateSubcategoryDto = z.infer<typeof CreateSubcategorySchema>;
export type DeleteSubcategoryDto = z.infer<typeof DeleteSubcategorySchema>;
