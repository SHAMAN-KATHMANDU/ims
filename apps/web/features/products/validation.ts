/**
 * Products feature Zod schemas.
 */

import { z } from "zod";

export const CreateProductSchema = z.object({
  imsCode: z.string().min(1, "IMS Code is required").max(50),
  name: z.string().min(1, "Name is required").max(200),
  categoryId: z.string().uuid("Invalid category"),
  description: z.string().max(2000).optional(),
  costPrice: z.coerce.number().min(0),
  mrp: z.coerce.number().min(0),
  vendorId: z.string().uuid().optional().nullable(),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export const CategoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required").max(200),
  description: z.string().max(2000).optional().default(""),
  subcategories: z.array(z.string()).default([]),
});

/** Form schema for product create/edit - uses string for numeric inputs (coerced on submit) */
export const ProductFormSchema = z.object({
  imsCode: z.string().min(1, "IMS code (barcode) is required").max(50),
  name: z.string().min(1, "Product name is required").max(200),
  categoryId: z.string().uuid("Invalid category"),
  subCategory: z.string().max(100).optional().default(""),
  description: z.string().max(2000).optional().default(""),
  length: z.string().optional().default(""),
  breadth: z.string().optional().default(""),
  height: z.string().optional().default(""),
  weight: z.string().optional().default(""),
  costPrice: z.string().optional().default(""),
  mrp: z.string().optional().default(""),
  vendorId: z
    .union([z.string().uuid(), z.literal("")])
    .optional()
    .nullable(),
});

export type ProductFormInput = z.infer<typeof ProductFormSchema>;

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type CategoryFormInput = z.infer<typeof CategoryFormSchema>;
