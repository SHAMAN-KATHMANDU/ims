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

  // Column B: Category
  category: z
    .union([z.string(), z.number()])
    .transform((val) => String(val).trim())
    .refine((val) => val !== "" && val !== "-", {
      message: "Category is required",
    }),

  // Column C: SUB-CATEGORY (optional)
  subCategory: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      const str = String(val).trim();
      return str === "" || str === "-" ? null : str;
    }),

  // Column D: Name of Product
  name: z
    .union([z.string(), z.number()])
    .transform((val) => String(val).trim())
    .refine((val) => val !== "" && val !== "-", {
      message: "Name of Product is required",
    }),

  // Column E: Variations (Designs/Colors)
  variation: z
    .union([z.string(), z.number()])
    .transform((val) => String(val).trim())
    .refine((val) => val !== "" && val !== "-", {
      message: "Variations (Designs/Colors) is required",
    }),

  // Column F: MATERIAL
  material: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      const str = String(val).trim();
      return str === "" || str === "-" ? null : str;
    }),

  // Column G: Length
  length: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === "number") return val;
      const num = parseFloat(String(val));
      return isNaN(num) ? null : num;
    }),

  // Column H: Breadth
  breadth: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === "number") return val;
      const num = parseFloat(String(val));
      return isNaN(num) ? null : num;
    }),

  // Column I: Height
  height: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === "number") return val;
      const num = parseFloat(String(val));
      return isNaN(num) ? null : num;
    }),

  // Column J: Weight
  weight: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === "number") return val;
      const num = parseFloat(String(val));
      return isNaN(num) ? null : num;
    }),

  // Column K: VENDOR
  vendor: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      const str = String(val).trim();
      return str === "" || str === "-" ? null : str;
    }),

  // Column L: QTY
  quantity: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return 0;
      if (typeof val === "number") return Math.floor(val);
      const num = parseFloat(String(val));
      return isNaN(num) ? 0 : Math.floor(num);
    }),

  // Column M: Cost Price
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

  // Column N: Final SP (Selling Price / MRP)
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

  // Column O: NON MEMBER DISCOUNT
  nonMemberDiscount: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === "number") return val;
      const num = parseFloat(String(val));
      return isNaN(num) ? null : num;
    }),

  // Column P: MEMBER DISCOUNT
  memberDiscount: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === "number") return val;
      const num = parseFloat(String(val));
      return isNaN(num) ? null : num;
    }),

  // Column Q: WHOLESALE DISCOUNT
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
