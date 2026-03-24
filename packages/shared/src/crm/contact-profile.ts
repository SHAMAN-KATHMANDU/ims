import { z } from "zod";

/** Optional contact profile fields shared by API and web forms. */
export const ContactProfileFieldsSchema = z.object({
  birthDate: z.string().max(40).optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
});

export type ContactProfileFields = z.infer<typeof ContactProfileFieldsSchema>;
