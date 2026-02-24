import { z } from "zod";

const variationSchema = z.object({
  imsCode: z
    .string({ required_error: "Each variation must have an IMS code" })
    .min(1, "Each variation must have an IMS code")
    .transform((v) => v.trim()),
  stockQuantity: z.coerce.number().min(0).default(0),
  attributes: z
    .array(
      z.object({
        attributeTypeId: z.string().uuid(),
        attributeValueId: z.string().uuid(),
      }),
    )
    .optional(),
  subVariants: z.array(z.string()).optional(),
  photos: z
    .array(
      z.object({
        photoUrl: z.string().url(),
        isPrimary: z.boolean().optional(),
      }),
    )
    .optional(),
});

const discountSchema = z.object({
  discountTypeId: z
    .string({ required_error: "Discount type ID is required" })
    .uuid("Discount type ID must be a valid UUID"),
  discountPercentage: z.coerce.number().min(0).max(100),
  valueType: z.enum(["PERCENTAGE", "FLAT"]).default("PERCENTAGE"),
  value: z.coerce.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const createProductSchema = z.object({
  name: z
    .string({ required_error: "Product name is required" })
    .min(1, "Product name is required"),
  categoryId: z
    .string({ required_error: "Category ID is required" })
    .uuid("Category ID must be a valid UUID"),
  description: z.string().nullish(),
  subCategory: z.string().nullish(),
  length: z.coerce.number().positive().nullish(),
  breadth: z.coerce.number().positive().nullish(),
  height: z.coerce.number().positive().nullish(),
  weight: z.coerce.number().positive().nullish(),
  costPrice: z.coerce.number({ required_error: "Cost price is required" }),
  mrp: z.coerce.number({ required_error: "MRP is required" }),
  vendorId: z.string().uuid().nullish(),
  defaultLocationId: z.string().uuid().nullish(),
  attributeTypeIds: z.array(z.string().uuid()).optional(),
  variations: z
    .array(variationSchema)
    .min(1, "At least one variation is required")
    .refine(
      (vars) => {
        const codes = vars.map((v) => v.imsCode);
        return new Set(codes).size === codes.length;
      },
      { message: "Duplicate IMS codes in variations" },
    ),
  discounts: z.array(discountSchema).optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  description: z.string().nullish(),
  subCategory: z.string().nullish(),
  length: z.coerce.number().positive().nullish(),
  breadth: z.coerce.number().positive().nullish(),
  height: z.coerce.number().positive().nullish(),
  weight: z.coerce.number().positive().nullish(),
  costPrice: z.coerce.number().optional(),
  mrp: z.coerce.number().optional(),
  vendorId: z.string().uuid().nullish(),
  attributeTypeIds: z.array(z.string().uuid()).optional(),
  variations: z.array(variationSchema).optional(),
  discounts: z.array(discountSchema).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
