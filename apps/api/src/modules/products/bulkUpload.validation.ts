import { z } from "zod";
import type { BulkParseOptions } from "@/utils/bulkParse";

/**
 * Known (predefined) Excel headers that map to specific database fields.
 * Any header NOT in this set is treated as a dynamic product attribute.
 */
export const KNOWN_HEADER_FIELDS = [
  "imsCode",
  "location",
  "category",
  "subCategory",
  "name",
  "description",
  "length",
  "breadth",
  "height",
  "weight",
  "vendor",
  "quantity",
  "costPrice",
  "finalSP",
] as const;

/**
 * Zod schema for the known (predefined) columns of a product bulk upload row.
 * Dynamic attribute columns are handled separately by the parser and
 * attached as `dynamicAttributes` on each row.
 */
export const excelProductRowSchema = z.object({
  imsCode: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      const str = String(val).trim();
      return str === "" || str === "-" ? null : str;
    }),

  location: z
    .union([z.string(), z.number()])
    .transform((val) => String(val).trim())
    .refine((val) => val !== "" && val !== "-", {
      message: "Location is required (use location name or ID)",
    }),

  category: z
    .union([z.string(), z.number()])
    .transform((val) => String(val).trim())
    .refine((val) => val !== "" && val !== "-", {
      message: "Category is required",
    }),

  subCategory: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      const str = String(val).trim();
      return str === "" || str === "-" ? null : str;
    }),

  name: z
    .union([z.string(), z.number()])
    .transform((val) => String(val).trim())
    .refine((val) => val !== "" && val !== "-", {
      message: "Name of Product is required",
    }),

  description: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      const str = String(val).trim();
      return str === "" || str === "-" ? null : str;
    }),

  length: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === "number") return val;
      const num = parseFloat(String(val));
      return isNaN(num) ? null : num;
    }),

  breadth: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === "number") return val;
      const num = parseFloat(String(val));
      return isNaN(num) ? null : num;
    }),

  height: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === "number") return val;
      const num = parseFloat(String(val));
      return isNaN(num) ? null : num;
    }),

  weight: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === "number") return val;
      const num = parseFloat(String(val));
      return isNaN(num) ? null : num;
    }),

  vendor: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      const str = String(val).trim();
      return str === "" || str === "-" ? null : str;
    }),

  quantity: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return 0;
      if (typeof val === "number") return Math.floor(val);
      const num = parseFloat(String(val));
      return isNaN(num) ? 0 : Math.floor(num);
    }),

  costPrice: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === "number" ? val : parseFloat(String(val));
      if (isNaN(num)) throw new Error("Cost Price must be a valid number");
      return num;
    })
    .refine((val) => val >= 0, {
      message: "Cost Price must be greater than or equal to 0",
    }),

  finalSP: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === "number" ? val : parseFloat(String(val));
      if (isNaN(num)) throw new Error("Final SP must be a valid number");
      return num;
    })
    .refine((val) => val >= 0, {
      message: "Final SP must be greater than or equal to 0",
    }),

  /**
   * Dynamic attribute columns detected at parse time.
   * Map of original header name → cell value (trimmed string).
   * e.g. { "Color": "Red", "Size": "L", "Material": "Cotton" }
   */
  dynamicAttributes: z
    .record(z.string(), z.string())
    .optional()
    .default({}),
});

export type ExcelProductRow = z.infer<typeof excelProductRowSchema>;

/** Field names for product bulk parse (known column mapping keys). */
export const productBulkFields = [...KNOWN_HEADER_FIELDS] as string[];

/** Header mappings for product bulk file (Excel/CSV). */
export const productBulkHeaderMappings: Record<string, string[]> = {
  imsCode: [
    "imscode",
    "ims_code",
    "ims",
    "productcode",
    "product_code",
    "product code",
  ],
  location: ["location", "locationname", "location_id", "locationid"],
  category: ["category"],
  subCategory: ["subcategory", "sub-category", "sub_category"],
  name: ["nameofproduct", "name", "productname", "product_name"],
  description: ["description", "desc"],
  length: ["length"],
  breadth: ["breadth", "bredth", "width"],
  height: ["height"],
  weight: ["weight"],
  vendor: ["vendor"],
  quantity: ["qty", "quantity"],
  costPrice: ["costprice", "cost_price", "cost"],
  finalSP: ["finalsp", "final_sp", "sellingprice", "mrp", "price"],
};

/** Required columns for product bulk upload. */
export const productBulkRequiredColumns = [
  "location",
  "category",
  "name",
  "costPrice",
  "finalSP",
];

/** Options for parseBulkFile when parsing product bulk uploads. */
export function getProductBulkParseOptions(): BulkParseOptions<ExcelProductRow> {
  return {
    headerMappings: productBulkHeaderMappings,
    requiredColumns: productBulkRequiredColumns,
    schema: excelProductRowSchema,
    fields: [...productBulkFields],
    skipExcelRows: 2,
    collectDynamicAttributes: true,
    missingColumnsHint:
      "Please ensure your file has headers: Location, Category, Name of Product, Cost Price, Final SP. Optional: Product Code (barcode). Any extra columns (e.g. Color, Size, Material) will be treated as product attributes.",
  };
}
