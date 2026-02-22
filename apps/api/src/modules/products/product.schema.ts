import { z } from "zod";

const optionalTrimmedString = z.string().trim().min(1).optional();
const queryBooleanSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    if (value === "true" || value === "1") return true;
    if (value === "false" || value === "0") return false;
  }
  return value;
}, z.boolean());

const optionalNumber = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().optional(),
);

const photoSchema = z.object({
  photoUrl: z.string().trim().min(1, "photoUrl is required"),
  isPrimary: z.boolean().optional(),
});

const subVariantSchema = z.union([
  z.string().trim().min(1),
  z.object({ name: z.string().trim().min(1) }),
]);

const variationSchema = z.object({
  color: z.string().trim().min(1, "color is required"),
  stockQuantity: z.coerce.number().int().min(0).optional(),
  photos: z.array(photoSchema).optional(),
  subVariants: z.array(subVariantSchema).optional(),
});

const discountSchema = z
  .object({
    discountTypeId: z.string().trim().min(1).optional(),
    discountTypeName: z.string().trim().min(1).optional(),
    discountPercentage: z.coerce.number().min(0),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => value.discountTypeId || value.discountTypeName, {
    message: "discountTypeId or discountTypeName is required",
  });

const requiredNumber = (message: string) =>
  z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number({ invalid_type_error: message }),
  );

export const createProductSchema = z
  .object({
    imsCode: z.string().trim().min(1, "IMS code is required"),
    name: z.string().trim().min(1, "Product name is required"),
    categoryId: optionalTrimmedString,
    categoryName: optionalTrimmedString,
    description: z.string().trim().optional(),
    subCategory: z.string().trim().optional(),
    length: optionalNumber,
    breadth: optionalNumber,
    height: optionalNumber,
    weight: optionalNumber,
    costPrice: requiredNumber("Cost price is required"),
    mrp: requiredNumber("MRP is required"),
    vendorId: optionalTrimmedString,
    defaultLocationId: optionalTrimmedString,
    variations: z.array(variationSchema).optional(),
    discounts: z.array(discountSchema).optional(),
  })
  .refine((value) => value.categoryId || value.categoryName, {
    message: "Category ID or Category Name is required",
  });

export const updateProductSchema = z.object({
  imsCode: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  categoryId: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  subCategory: z.string().trim().optional(),
  length: optionalNumber,
  breadth: optionalNumber,
  height: optionalNumber,
  weight: optionalNumber,
  costPrice: optionalNumber,
  mrp: optionalNumber,
  vendorId: z.string().trim().optional().nullable(),
  variations: z.array(variationSchema).optional(),
  discounts: z.array(discountSchema).optional(),
});

export const productIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Product ID is required"),
});

export const productsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  search: z.string().trim().optional(),
  sortBy: z
    .enum([
      "dateCreated",
      "dateModified",
      "name",
      "imsCode",
      "costPrice",
      "mrp",
      "vendorId",
      "id",
      "vendorName",
    ])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  locationId: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  subCategoryId: z.string().trim().optional(),
  subCategory: z.string().trim().optional(),
  vendorId: z.string().trim().optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  lowStock: queryBooleanSchema.optional(),
});

export const productDiscountsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  search: z.string().trim().optional(),
  productId: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  subCategoryId: z.string().trim().optional(),
  discountTypeId: z.string().trim().optional(),
  sortBy: z
    .enum([
      "id",
      "value",
      "productName",
      "discountTypeName",
      "startDate",
      "endDate",
      "createdAt",
      "valueType",
      "isActive",
    ])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});
