import { z } from "zod";

// ─── Money / decimal validators ──────────────────────────────────────────────
// Price and dimension columns are Postgres NUMERIC(10,2) and the discount value
// column is NUMERIC(12,2). Bare `z.coerce.number()` accepts NaN, Infinity, and
// values outside the column's range — those reach Prisma and explode into an
// opaque 500 ("Error Saving Product") instead of a clean validation error.
// Bound them to the column domain up front so an invalid price returns a 400.
const DECIMAL_10_2_MAX = 99_999_999.99;
const DECIMAL_12_2_MAX = 9_999_999_999.99;

/** Non-negative NUMERIC(10,2)-safe amount (prices, dimensions, overrides). */
const decimal10 = z.coerce
  .number()
  .finite("Value must be a finite number")
  .min(0, "Value cannot be negative")
  .max(DECIMAL_10_2_MAX, "Value exceeds the maximum allowed amount");

/** Strictly-positive NUMERIC(10,2)-safe dimension (length/breadth/height/weight). */
const decimalDim = z.coerce
  .number()
  .finite("Value must be a finite number")
  .positive("Value must be greater than 0")
  .max(DECIMAL_10_2_MAX, "Value exceeds the maximum allowed amount");

/** Non-negative NUMERIC(12,2)-safe amount (discount value). */
const decimal12 = z.coerce
  .number()
  .finite("Value must be a finite number")
  .min(0, "Value cannot be negative")
  .max(DECIMAL_12_2_MAX, "Value exceeds the maximum allowed amount");

// ─── Query schemas (for list and export) ─────────────────────────────────────

export const GetAllProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.string().optional().default("dateCreated"),
  sortOrder: z
    .string()
    .optional()
    .transform((v) =>
      v?.toLowerCase() === "desc" ? ("desc" as const) : ("asc" as const),
    ),
  search: z
    .string()
    .optional()
    .transform((v) => v?.trim() || ""),
  locationId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  subCategoryId: z.string().uuid().optional(),
  subCategory: z.string().optional(),
  vendorId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  lowStock: z
    .union([
      z.literal("1"),
      z.literal("true"),
      z.literal("0"),
      z.literal("false"),
    ])
    .optional()
    .transform((v) => v === "1" || v === "true"),
});

export const DownloadProductsQuerySchema = z.object({
  format: z
    .string()
    .optional()
    .default("excel")
    .transform((v) => v?.toLowerCase() || "excel")
    .refine((v) => v === "excel" || v === "csv", {
      message: "Invalid format. Supported formats: excel, csv",
    }),
  ids: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
        : undefined,
    ),
  // Filters (same as list). When ids is omitted, only products matching these filters are exported.
  search: z
    .string()
    .optional()
    .transform((v) => v?.trim() || ""),
  locationId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  subCategoryId: z.string().uuid().optional(),
  subCategory: z.string().optional(),
  vendorId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  lowStock: z
    .union([
      z.literal("1"),
      z.literal("true"),
      z.literal("0"),
      z.literal("false"),
    ])
    .optional()
    .transform((v) => v === "1" || v === "true"),
});

export const GetListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.string().optional().default("id"),
  sortOrder: z
    .string()
    .optional()
    .transform((v) =>
      v?.toLowerCase() === "desc" ? ("desc" as const) : ("asc" as const),
    ),
  search: z
    .string()
    .optional()
    .transform((v) => v?.trim() ?? "")
    .default(""),
});

export const GetProductDiscountsListQuerySchema = GetListQuerySchema.extend({
  productId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  subCategoryId: z.string().uuid().optional(),
  discountTypeId: z.string().uuid().optional(),
});

export const GetProductByImsQuerySchema = z.object({
  imsCode: z
    .string()
    .min(1, "Product code is required")
    .transform((v) => v.trim()),
  locationId: z.string().uuid().optional(),
});

export type GetAllProductsQueryDto = z.infer<typeof GetAllProductsQuerySchema>;
export type GetProductByImsQueryDto = z.infer<
  typeof GetProductByImsQuerySchema
>;
export type DownloadProductsQueryDto = z.infer<
  typeof DownloadProductsQuerySchema
>;
export type GetListQueryDto = z.infer<typeof GetListQuerySchema>;
export type GetProductDiscountsListQueryDto = z.infer<
  typeof GetProductDiscountsListQuerySchema
>;

// ─── Bulk upload (re-export for alignment) ───────────────────────────────────

export {
  getProductBulkParseOptions,
  excelProductRowSchema,
  productBulkFields,
  productBulkHeaderMappings,
  productBulkRequiredColumns,
  KNOWN_HEADER_FIELDS,
} from "./bulkUpload.validation";
export type { ExcelProductRow } from "./bulkUpload.validation";

// ─── Variation schema (used in create/update product) ────────────────────────
const VariationSchema = z.object({
  id: z.string().uuid().optional(),
  stockQuantity: z.coerce
    .number()
    .min(0)
    .max(2147483647, "Stock quantity exceeds maximum allowed value")
    .default(0),
  /** When editing existing variation stock, specify which location's inventory to update */
  locationId: z.string().uuid().optional(),
  costPriceOverride: decimal10.nullish(),
  mrpOverride: decimal10.nullish(),
  finalSpOverride: decimal10.nullish(),
  attributes: z
    .array(
      z.object({
        attributeTypeId: z.string().uuid(),
        attributeValueId: z.string().uuid(),
      }),
    )
    .optional(),
  subVariants: z
    .array(z.union([z.string(), z.object({ name: z.string() })]))
    .optional(),
  photos: z
    .array(
      z.object({
        photoUrl: z.string().url(),
        isPrimary: z.boolean().optional(),
      }),
    )
    .optional(),
});

// Discount schema (used in create/update product)
// Use preprocess to handle empty string, null, undefined, NaN - prevents false
// "number must be less than or equal to 100" when field is empty or mid-edit
const DiscountSchema = z.object({
  discountTypeId: z
    .string({ required_error: "Discount type ID is required" })
    .uuid("Discount type ID must be a valid UUID"),
  discountPercentage: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return 0;
      const num = Number(val);
      return Number.isFinite(num) ? num : 0;
    },
    z
      .number()
      .min(0, "Discount must be at least 0")
      .max(100, "Discount percentage must be between 0 and 100"),
  ),
  valueType: z.enum(["PERCENTAGE", "FLAT"]).default("PERCENTAGE"),
  value: decimal12.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const CreateProductSchema = z.object({
  imsCode: z.preprocess((val) => {
    if (val === undefined || val === null) return undefined;
    const s = String(val).trim();
    return s === "" ? undefined : s;
  }, z.string().max(100, "Product code must be at most 100 characters").optional()),
  name: z
    .string({ required_error: "Product name is required" })
    .min(1, "Product name is required"),
  categoryId: z
    .string({ required_error: "Category ID is required" })
    .uuid("Category ID must be a valid UUID"),
  description: z.string().nullish(),
  subCategory: z.string().nullish(),
  length: decimalDim.nullish(),
  breadth: decimalDim.nullish(),
  height: decimalDim.nullish(),
  weight: decimalDim.nullish(),
  costPrice: z.coerce
    .number({ required_error: "Cost price is required" })
    .finite("Cost price must be a valid number")
    .min(0, "Cost price cannot be negative")
    .max(DECIMAL_10_2_MAX, "Cost price exceeds the maximum allowed value"),
  mrp: z.coerce
    .number({ required_error: "MRP is required" })
    .finite("MRP must be a valid number")
    .min(0, "MRP cannot be negative")
    .max(DECIMAL_10_2_MAX, "MRP exceeds the maximum allowed value"),
  vendorId: z.string().uuid().nullish(),
  defaultLocationId: z.string().uuid().nullish(),
  attributeTypeIds: z.array(z.string().uuid()).optional(),
  /**
   * Optional list of `ProductTag.id` values to attach to this product.
   * Tags are internal-only — never surfaced via /public/* routes.
   */
  tagIds: z.array(z.string().uuid()).optional(),
  variations: z
    .array(VariationSchema)
    .min(1, "At least one variation is required"),
  discounts: z.array(DiscountSchema).optional(),
});

export const UpdateProductSchema = z.object({
  imsCode: z
    .string()
    .min(1, "Product code cannot be empty")
    .max(100)
    .transform((v) => v.trim())
    .optional(),
  name: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  description: z.string().nullish(),
  subCategory: z.string().nullish(),
  length: decimalDim.nullish(),
  breadth: decimalDim.nullish(),
  height: decimalDim.nullish(),
  weight: decimalDim.nullish(),
  costPrice: decimal10.optional(),
  mrp: decimal10.optional(),
  vendorId: z.string().uuid().nullish(),
  attributeTypeIds: z.array(z.string().uuid()).optional(),
  /**
   * When provided, replaces the product's tag links wholesale. Internal-only.
   */
  tagIds: z.array(z.string().uuid()).optional(),
  variations: z.array(VariationSchema).optional(),
  discounts: z.array(DiscountSchema).optional(),
});

// ─── Product tag schemas (internal-only — never reach /public/*) ─────────────
export const CreateProductTagSchema = z.object({
  name: z.string().trim().min(1, "Tag name is required").max(100),
});

export const UpdateProductTagSchema = z.object({
  name: z.string().trim().min(1, "Tag name is required").max(100),
});

export const ListProductTagsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined),
});

export type CreateProductTagDto = z.infer<typeof CreateProductTagSchema>;
export type UpdateProductTagDto = z.infer<typeof UpdateProductTagSchema>;
export type ListProductTagsQueryDto = z.infer<
  typeof ListProductTagsQuerySchema
>;

// Helper/related schemas
export const CreateDiscountTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  defaultPercentage: z.coerce
    .number()
    .min(0, "Percentage must be at least 0")
    .max(100, "Default percentage must be between 0 and 100")
    .optional(),
});

export const UpdateDiscountTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  defaultPercentage: z.coerce
    .number()
    .min(0, "Percentage must be at least 0")
    .max(100, "Default percentage must be between 0 and 100")
    .nullable()
    .optional(),
});

export type CreateProductDto = z.infer<typeof CreateProductSchema>;
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;
export type CreateDiscountTypeDto = z.infer<typeof CreateDiscountTypeSchema>;
export type UpdateDiscountTypeDto = z.infer<typeof UpdateDiscountTypeSchema>;
