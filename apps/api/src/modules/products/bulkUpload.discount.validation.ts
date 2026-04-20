import { z } from "zod";
import type { BulkParseOptions } from "@/utils/bulkParse";

function optionalDate(val: unknown): Date | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (!str || str === "-") return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export const discountBulkRowSchema = z.object({
  productCode: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      const str = String(val).trim();
      return str === "" || str === "-" ? null : str;
    }),

  productName: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      const str = String(val).trim();
      return str === "" || str === "-" ? null : str;
    }),

  discountType: z
    .union([z.string(), z.number()])
    .transform((val) => String(val).trim())
    .refine((val) => val !== "" && val !== "-", {
      message: "Discount type name is required",
    }),

  discountPercentage: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === "number" ? val : parseFloat(String(val));
      if (isNaN(num))
        throw new Error("Discount percentage must be a valid number");
      return num;
    })
    .refine((val) => val >= 0 && val <= 100, {
      message: "Discount percentage must be between 0 and 100",
    }),

  startDate: z
    .unknown()
    .optional()
    .transform((val) => optionalDate(val)),

  endDate: z
    .unknown()
    .optional()
    .transform((val) => optionalDate(val)),

  isActive: z
    .union([z.string(), z.boolean(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return true;
      if (typeof val === "boolean") return val;
      if (typeof val === "number") return val !== 0;
      const s = String(val).toLowerCase().trim();
      return s !== "false" && s !== "0" && s !== "no" && s !== "inactive";
    }),
});

export type DiscountBulkRow = z.infer<typeof discountBulkRowSchema>;

export const discountBulkHeaderMappings: Record<string, string[]> = {
  productCode: ["productcode", "ims_code", "imscode", "ims", "code", "barcode"],
  productName: ["productname", "product_name", "name", "nameofproduct"],
  discountType: ["discounttype", "discount_type", "type"],
  discountPercentage: [
    "discountpercentage",
    "discount_percentage",
    "discount",
    "percentage",
    "percent",
    "value",
  ],
  startDate: ["startdate", "start_date", "from", "from_date"],
  endDate: ["enddate", "end_date", "to", "to_date"],
  isActive: ["isactive", "is_active", "active", "status"],
};

export const discountBulkRequiredColumns = [
  "discountType",
  "discountPercentage",
];

export function getDiscountBulkParseOptions(): BulkParseOptions<DiscountBulkRow> {
  return {
    headerMappings: discountBulkHeaderMappings,
    requiredColumns: discountBulkRequiredColumns,
    schema: discountBulkRowSchema,
    fields: [
      "productCode",
      "productName",
      "discountType",
      "discountPercentage",
      "startDate",
      "endDate",
      "isActive",
    ],
    skipExcelRows: 2,
    collectDynamicAttributes: false,
    missingColumnsHint:
      "Required headers: Discount Type, Discount Percentage. " +
      "At least one of Product Code or Product Name must be provided per row. " +
      "Optional: Start Date, End Date, Is Active (true/false).",
  };
}
