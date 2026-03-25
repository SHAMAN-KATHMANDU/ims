import { z } from "zod";
import type { BulkParseOptions } from "@/utils/bulkParse";

/**
 * Parse date from Excel (serial number, ISO string, or common formats).
 * Handles: Excel serial, "YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY", etc.
 */
function parseDateValue(
  value: string | number | Date | null | undefined,
): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  const str = String(value).trim();
  if (str === "" || str === "-") return null;

  if (typeof value === "number") {
    // Excel serial date (days since 1900-01-01)
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + value * 86400000);
    return isNaN(d.getTime()) ? null : d;
  }

  const iso = /^\d{4}-\d{2}-\d{2}(T|$)/.test(str);
  if (iso) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Zod schema for Excel row data validation.
 * Column headers are matched case-insensitively.
 *
 * Required: Showroom, Sold by, Product Code, Product Name, Quantity, MRP, Final amount
 * Optional: SN, sale_id, Date of sale, Phone number, Attributes/Variation, Discount, Payment method
 */
export const excelSaleRowSchema = z.object({
  sn: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      const s = String(val).trim();
      return s === "" || s === "-" ? null : s;
    }),

  saleId: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      const s = String(val).trim();
      return s === "" || s === "-" ? null : s;
    })
    .refine(
      (val) => {
        if (val === null) return true;
        const uuidRegex =
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
        return uuidRegex.test(val);
      },
      {
        message:
          "sale_id must be a valid UUID (e.g. xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx) when provided",
      },
    ),

  dateOfSale: z
    .union([z.string(), z.number(), z.date(), z.null(), z.undefined()])
    .optional()
    .transform(parseDateValue),

  phone: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      const s = String(val).replace(/[\s-]/g, "").trim();
      return s === "" || s === "-" ? null : s;
    }),

  showroom: z
    .union([z.string(), z.number()])
    .transform((val) => String(val).trim())
    .refine((val) => val !== "" && val !== "-", {
      message: "Showroom is required",
    }),

  soldBy: z
    .union([z.string(), z.number()])
    .transform((val) => String(val).trim())
    .refine((val) => val !== "" && val !== "-", {
      message: "Sold by is required",
    }),

  productImsCode: z
    .union([z.string(), z.number()])
    .transform((val) => String(val).trim())
    .refine((val) => val !== "" && val !== "-", {
      message: "Product code is required",
    }),

  productName: z
    .union([z.string(), z.number()])
    .transform((val) => String(val).trim())
    .refine((val) => val !== "" && val !== "-", {
      message: "Product Name is required",
    }),

  variation: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      const str = String(val).trim();
      return str === "" || str === "-" ? null : str;
    }),

  quantity: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === "number" ? val : parseFloat(String(val));
      if (isNaN(num)) throw new Error("Quantity must be a valid number");
      return Math.floor(num);
    })
    .refine((val) => val > 0, {
      message: "Quantity must be greater than 0",
    }),

  mrp: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === "number" ? val : parseFloat(String(val));
      if (isNaN(num)) throw new Error("MRP must be a valid number");
      return num;
    })
    .refine((val) => val >= 0, {
      message: "MRP must be greater than or equal to 0",
    }),

  discount: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return 0;
      const num = typeof val === "number" ? val : parseFloat(String(val));
      return isNaN(num) ? 0 : Math.max(0, Math.min(100, num));
    }),

  finalAmount: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === "number" ? val : parseFloat(String(val));
      if (isNaN(num)) throw new Error("Final amount must be a valid number");
      return num;
    })
    .refine((val) => val >= 0, {
      message: "Final amount must be greater than or equal to 0",
    }),

  paymentMethod: z
    .union([z.string(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      const str = String(val).trim().toUpperCase();
      return str === "" || str === "-" ? null : str;
    })
    .refine(
      (val) => {
        if (val === null) return true;
        return /^[A-Z0-9_]{2,32}$/.test(val);
      },
      {
        message:
          "Payment method must be uppercase letters/numbers/underscore (2-32 chars)",
      },
    ),
});

export type ExcelSaleRow = z.infer<typeof excelSaleRowSchema>;

/** Field names for sale bulk parse. */
export const saleBulkFields = [
  "sn",
  "saleId",
  "dateOfSale",
  "showroom",
  "phone",
  "soldBy",
  "productImsCode",
  "productName",
  "variation",
  "quantity",
  "mrp",
  "discount",
  "finalAmount",
  "paymentMethod",
] as const;

/** Header mappings for sale bulk file. */
export const saleBulkHeaderMappings: Record<string, string[]> = {
  sn: ["sn", "sno", "serial", "serialnumber"],
  saleId: ["saleid", "sale_id", "id"],
  dateOfSale: ["dateofsale", "date_of_sale", "date", "saledate", "sale_date"],
  showroom: ["showroom", "location", "store"],
  phone: [
    "phonenumber",
    "phone_number",
    "phone",
    "customerphone",
    "customer_phone",
    "mobile",
    "contact",
  ],
  soldBy: ["soldby", "sold_by", "seller", "createdby", "created_by"],
  productImsCode: [
    "productimscode",
    "product_ims_code",
    "productcode",
    "product_code",
    "product code",
    "imscode",
    "ims_code",
    "ims",
  ],
  productName: [
    "productname",
    "product_name",
    "name",
    "product",
    "productnamr",
  ],
  variation: [
    "variation",
    "design",
    "variations",
    "variant",
    "attributes",
    "attribute",
  ],
  quantity: ["quantity", "qty"],
  mrp: ["mrp", "price", "unitprice", "unit_price"],
  discount: ["discount", "discountpercent", "discount_percent"],
  finalAmount: [
    "finalamount",
    "final_amount",
    "line_total",
    "linetotal",
    "amount",
  ],
  paymentMethod: ["paymentmethod", "payment_method", "method", "payment"],
};

/** Required columns for sale bulk upload. */
export const saleBulkRequiredColumns = [
  "showroom",
  "soldBy",
  "productImsCode",
  "productName",
  "quantity",
  "mrp",
  "finalAmount",
];

/** Options for parseBulkFile when parsing sale bulk uploads. */
export function getSaleBulkParseOptions(): BulkParseOptions<ExcelSaleRow> {
  return {
    headerMappings: saleBulkHeaderMappings,
    requiredColumns: saleBulkRequiredColumns,
    schema: excelSaleRowSchema,
    fields: [...saleBulkFields],
    skipExcelRows: 1,
    missingColumnsHint:
      "Required: Showroom, Sold by, Product Code, Product Name, Quantity, MRP, Final amount. Optional: SN, sale_id, Date of sale, Phone number, Attributes, Discount, Payment method (e.g. CASH, CARD, BANK_TRANSFER).",
  };
}
