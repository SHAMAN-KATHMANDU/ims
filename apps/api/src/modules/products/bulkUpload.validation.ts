import { z } from "zod";
import type { BulkParseOptions } from "@/utils/bulkParse";

/**
 * Zod schema for Excel/CSV row data validation
 * Maps columns to product fields
 * Users are expected to provide correct numeric values without units or percentage signs
 */
export const excelProductRowSchema = z
  .object({
    // Column A: IMS CODE
    imsCode: z
      .union([z.string(), z.number()])
      .transform((val) => String(val).trim())
      .refine((val) => val !== "" && val !== "-", {
        message: "IMS CODE is required",
      }),

    // Column B: Location (showroom/warehouse name or ID)
    location: z
      .union([z.string(), z.number()])
      .transform((val) => String(val).trim())
      .refine((val) => val !== "" && val !== "-", {
        message: "Location is required (use location name or ID)",
      }),

    // Column C: Category
    category: z
      .union([z.string(), z.number()])
      .transform((val) => String(val).trim())
      .refine((val) => val !== "" && val !== "-", {
        message: "Category is required",
      }),

    // Column D: SUB-CATEGORY (optional)
    subCategory: z
      .union([z.string(), z.number(), z.null(), z.undefined()])
      .optional()
      .transform((val) => {
        if (val === null || val === undefined) return null;
        const str = String(val).trim();
        return str === "" || str === "-" ? null : str;
      }),

    // Column E: Name of Product
    name: z
      .union([z.string(), z.number()])
      .transform((val) => String(val).trim())
      .refine((val) => val !== "" && val !== "-", {
        message: "Name of Product is required",
      }),

    // Column F: Attributes (comma-separated attribute names, e.g. color, size)
    attributes: z
      .union([z.string(), z.number()])
      .transform((val) => String(val).trim())
      .refine((val) => val !== "" && val !== "-", {
        message:
          "Attributes is required (comma-separated names, e.g. color, size)",
      }),

    // Column G: Values (comma-separated attribute values, e.g. red, M)
    values: z
      .union([z.string(), z.number()])
      .transform((val) => String(val).trim())
      .refine((val) => val !== "" && val !== "-", {
        message: "Values is required (comma-separated values, e.g. red, M)",
      }),

    // Column H: Description
    description: z
      .union([z.string(), z.number(), z.null(), z.undefined()])
      .optional()
      .transform((val) => {
        if (val === null || val === undefined) return null;
        const str = String(val).trim();
        return str === "" || str === "-" ? null : str;
      }),

    // Column I: Length
    length: z
      .union([z.string(), z.number(), z.null(), z.undefined()])
      .optional()
      .transform((val) => {
        if (val === null || val === undefined) return null;
        if (typeof val === "number") return val;
        const num = parseFloat(String(val));
        return isNaN(num) ? null : num;
      }),

    // Column J: Breadth
    breadth: z
      .union([z.string(), z.number(), z.null(), z.undefined()])
      .optional()
      .transform((val) => {
        if (val === null || val === undefined) return null;
        if (typeof val === "number") return val;
        const num = parseFloat(String(val));
        return isNaN(num) ? null : num;
      }),

    // Column K: Height
    height: z
      .union([z.string(), z.number(), z.null(), z.undefined()])
      .optional()
      .transform((val) => {
        if (val === null || val === undefined) return null;
        if (typeof val === "number") return val;
        const num = parseFloat(String(val));
        return isNaN(num) ? null : num;
      }),

    // Column L: Weight
    weight: z
      .union([z.string(), z.number(), z.null(), z.undefined()])
      .optional()
      .transform((val) => {
        if (val === null || val === undefined) return null;
        if (typeof val === "number") return val;
        const num = parseFloat(String(val));
        return isNaN(num) ? null : num;
      }),

    // Column M: VENDOR
    vendor: z
      .union([z.string(), z.number(), z.null(), z.undefined()])
      .optional()
      .transform((val) => {
        if (val === null || val === undefined) return null;
        const str = String(val).trim();
        return str === "" || str === "-" ? null : str;
      }),

    // Column N: QTY
    quantity: z
      .union([z.string(), z.number(), z.null(), z.undefined()])
      .optional()
      .transform((val) => {
        if (val === null || val === undefined) return 0;
        if (typeof val === "number") return Math.floor(val);
        const num = parseFloat(String(val));
        return isNaN(num) ? 0 : Math.floor(num);
      }),

    // Column O: Cost Price
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

    // Column P: Final SP (Selling Price / MRP)
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

    // Column Q: NON MEMBER DISCOUNT
    nonMemberDiscount: z
      .union([z.string(), z.number(), z.null(), z.undefined()])
      .optional()
      .transform((val) => {
        if (val === null || val === undefined) return null;
        if (typeof val === "number") return val;
        const num = parseFloat(String(val));
        return isNaN(num) ? null : num;
      }),

    // Column R: MEMBER DISCOUNT
    memberDiscount: z
      .union([z.string(), z.number(), z.null(), z.undefined()])
      .optional()
      .transform((val) => {
        if (val === null || val === undefined) return null;
        if (typeof val === "number") return val;
        const num = parseFloat(String(val));
        return isNaN(num) ? null : num;
      }),

    // Column S: WHOLESALE DISCOUNT
    wholesaleDiscount: z
      .union([z.string(), z.number(), z.null(), z.undefined()])
      .optional()
      .transform((val) => {
        if (val === null || val === undefined) return null;
        if (typeof val === "number") return val;
        const num = parseFloat(String(val));
        return isNaN(num) ? null : num;
      }),
  })
  .refine(
    (row) => {
      const attrs = row.attributes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const vals = row.values
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return attrs.length === vals.length && attrs.length > 0;
    },
    {
      message:
        "Attributes and Values must have the same number of comma-separated items (e.g. color, size and red, M)",
    },
  );

export type ExcelProductRow = z.infer<typeof excelProductRowSchema>;

/** Field names for product bulk parse (column mapping keys). */
export const productBulkFields = [
  "imsCode",
  "location",
  "category",
  "subCategory",
  "name",
  "attributes",
  "values",
  "description",
  "length",
  "breadth",
  "height",
  "weight",
  "vendor",
  "quantity",
  "costPrice",
  "finalSP",
  "nonMemberDiscount",
  "memberDiscount",
  "wholesaleDiscount",
] as const;

/** Header mappings for product bulk file (Excel/CSV). */
export const productBulkHeaderMappings: Record<string, string[]> = {
  imsCode: ["imscode", "ims_code", "ims"],
  location: ["location", "locationname", "location_id", "locationid"],
  category: ["category"],
  subCategory: ["subcategory", "sub-category", "sub_category"],
  name: ["nameofproduct", "name", "productname", "product_name"],
  attributes: ["attributes", "attribute"],
  values: ["values", "value"],
  description: ["description", "material", "desc"],
  length: ["length"],
  breadth: ["breadth", "bredth", "width"],
  height: ["height"],
  weight: ["weight"],
  vendor: ["vendor"],
  quantity: ["qty", "quantity"],
  costPrice: ["costprice", "cost_price", "cost"],
  finalSP: ["finalsp", "final_sp", "sellingprice", "mrp", "price"],
  nonMemberDiscount: ["nonmemberdiscount", "non_member_discount", "nonmember"],
  memberDiscount: ["memberdiscount", "member_discount", "member"],
  wholesaleDiscount: ["wholesalediscount", "wholesale_discount", "wholesale"],
};

/** Required columns for product bulk upload. */
export const productBulkRequiredColumns = [
  "imsCode",
  "location",
  "category",
  "name",
  "attributes",
  "values",
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
    missingColumnsHint:
      "Please ensure your file has headers: IMS Code, Location, Category, Name of Product, Attributes, Values, Cost Price, Final SP",
  };
}
