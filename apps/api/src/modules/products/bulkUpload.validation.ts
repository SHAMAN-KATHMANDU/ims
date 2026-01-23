import { z } from "zod";

/**
 * Helper function to parse numeric value from string that may contain units
 * Examples: "5 CM" -> 5, "100 GMS" -> 100, "10 PCS" -> 10
 */
function parseNumericValue(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;

  const str = String(value).trim();
  if (str === "" || str === "-") return null;

  // Extract numeric part (handles decimals)
  const match = str.match(/^([\d.]+)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return null;
}

/**
 * Helper function to parse percentage value from string
 * Examples: "5%" -> 5, "10.0%" -> 10.0
 */
function parsePercentage(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;

  const str = String(value).trim();
  if (str === "" || str === "-") return null;

  // Remove % sign and extract numeric part
  const cleaned = str.replace(/%/g, "").trim();
  const match = cleaned.match(/^([\d.]+)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return null;
}

/**
 * Zod schema for Excel row data validation
 * Maps Excel columns to product fields
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

  // Column G: Length (e.g., "5 CM")
  length: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform(parseNumericValue),

  // Column H: Breadth (e.g., "3 CM")
  breadth: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform(parseNumericValue),

  // Column I: Height (e.g., "6 CM")
  height: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform(parseNumericValue),

  // Column J: Weight (e.g., "100 GMS")
  weight: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform(parseNumericValue),

  // Column K: VENDOR
  vendor: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      const str = String(val).trim();
      return str === "" || str === "-" ? null : str;
    }),

  // Column L: QTY (e.g., "10 PCS")
  quantity: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      const parsed = parseNumericValue(val);
      return parsed !== null ? Math.floor(parsed) : 0; // Convert to integer
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

  // Column O: NON MEMBER DISCOUNT (e.g., "5%")
  nonMemberDiscount: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform(parsePercentage),

  // Column P: MEMBER DISCOUNT (e.g., "10.0%")
  memberDiscount: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform(parsePercentage),

  // Column Q: WHOLESALE DISCOUNT (e.g., "20.0%")
  wholesaleDiscount: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform(parsePercentage),
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
