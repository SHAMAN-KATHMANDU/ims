import { z } from "zod";

/**
 * Zod schema for Excel/CSV row data validation
 * Maps columns to product fields
 * Users are expected to provide correct numeric values without units or percentage signs
 */
export const excelProductRowSchema = z.object({
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

  // Column F: Variations (Designs/Colors)
  variation: z
    .union([z.string(), z.number()])
    .transform((val) => String(val).trim())
    .refine((val) => val !== "" && val !== "-", {
      message: "Variations (Designs/Colors) is required",
    }),

  // Column G: MATERIAL
  material: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      const str = String(val).trim();
      return str === "" || str === "-" ? null : str;
    }),

  // Column H: Length
  length: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === "number") return val;
      const num = parseFloat(String(val));
      return isNaN(num) ? null : num;
    }),

  // Column I: Breadth
  breadth: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === "number") return val;
      const num = parseFloat(String(val));
      return isNaN(num) ? null : num;
    }),

  // Column J: Height
  height: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === "number") return val;
      const num = parseFloat(String(val));
      return isNaN(num) ? null : num;
    }),

  // Column K: Weight
  weight: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === "number") return val;
      const num = parseFloat(String(val));
      return isNaN(num) ? null : num;
    }),

  // Column L: VENDOR
  vendor: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      const str = String(val).trim();
      return str === "" || str === "-" ? null : str;
    }),

  // Column M: QTY
  quantity: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return 0;
      if (typeof val === "number") return Math.floor(val);
      const num = parseFloat(String(val));
      return isNaN(num) ? 0 : Math.floor(num);
    }),

  // Column N: Cost Price
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

  // Column O: Final SP (Selling Price / MRP)
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

  // Column P: NON MEMBER DISCOUNT
  nonMemberDiscount: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === "number") return val;
      const num = parseFloat(String(val));
      return isNaN(num) ? null : num;
    }),

  // Column Q: MEMBER DISCOUNT
  memberDiscount: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === "number") return val;
      const num = parseFloat(String(val));
      return isNaN(num) ? null : num;
    }),

  // Column R: WHOLESALE DISCOUNT
  wholesaleDiscount: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === "number") return val;
      const num = parseFloat(String(val));
      return isNaN(num) ? null : num;
    }),
});

export type ExcelProductRow = z.infer<typeof excelProductRowSchema>;

/**
 * Validation error with row number and field details
 */
export interface ValidationError {
  row: number;
  field?: string;
  message: string;
  value?: unknown;
}
