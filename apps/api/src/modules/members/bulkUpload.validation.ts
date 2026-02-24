import { z } from "zod";

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
 * Column headers are matched case-insensitively (e.g. "Phone number", "phone number", "PHONE NUMBER").
 *
 * Required: Phone number
 * Optional: SN, ID, Name, Address, DoB, Notes, Member since
 */
export const excelMemberRowSchema = z.object({
  sn: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      const s = String(val).trim();
      return s === "" || s === "-" ? null : s;
    }),

  /** Optional member_id (UUID). When provided, used as the member's primary key. Must be valid UUID format. */
  id: z
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
          "ID must be a valid UUID (e.g. xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx) when provided",
      },
    ),

  name: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      const s = String(val).trim();
      return s === "" || s === "-" ? null : s;
    }),

  address: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      const s = String(val).trim();
      return s === "" || s === "-" ? null : s;
    }),

  phone: z
    .union([z.string(), z.number()])
    .transform((val) => String(val).replace(/[\s-]/g, "").trim())
    .refine((val) => val.length > 0, {
      message: "Phone number is required",
    }),

  dob: z
    .union([z.string(), z.number(), z.date(), z.null(), z.undefined()])
    .optional()
    .transform(parseDateValue),

  notes: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      const s = String(val).trim();
      return s === "" || s === "-" ? null : s;
    }),

  memberSince: z
    .union([z.string(), z.number(), z.date(), z.null(), z.undefined()])
    .optional()
    .transform(parseDateValue),
});

export type ExcelMemberRow = z.infer<typeof excelMemberRowSchema>;
