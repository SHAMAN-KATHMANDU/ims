import { z } from "zod";

export const CONTACT_GENDER_VALUES = [
  "male",
  "female",
  "other",
  "prefer_not_to_say",
] as const;

export type ContactGender = (typeof CONTACT_GENDER_VALUES)[number];

/** Optional contact profile fields shared by API and web forms. */
export const ContactProfileFieldsSchema = z.object({
  birthDate: z
    .string()
    .max(40)
    .optional()
    .nullable()
    .refine(
      (v) => {
        if (v == null || !String(v).trim()) return true;
        const d = new Date(String(v).trim());
        if (Number.isNaN(d.getTime())) return false;
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        return d <= endOfToday;
      },
      { message: "Birth date cannot be in the future" },
    ),
  gender: z.enum(CONTACT_GENDER_VALUES).optional().nullable(),
});

export type ContactProfileFields = z.infer<typeof ContactProfileFieldsSchema>;
