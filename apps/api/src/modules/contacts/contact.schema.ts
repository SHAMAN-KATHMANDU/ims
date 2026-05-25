import { z } from "zod";
import { ContactProfileFieldsSchema } from "@repo/shared";

export const CreateContactSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(255)
      .refine(
        (s) => !/^\d+$/.test(s.trim()),
        "First name must include letters (cannot be numbers only)",
      ),
    lastName: z.string().max(255).optional(),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    phone: z.string().optional(),
    companyId: z.string().uuid().optional().nullable(),
    memberId: z.string().uuid().optional().nullable(),
    tagIds: z.array(z.string().uuid()).optional(),
    source: z.string().max(100).optional().nullable(),
  })
  .merge(ContactProfileFieldsSchema);

export const UpdateContactSchema = CreateContactSchema.partial();

export const CreateTagSchema = z.object({
  name: z.string().min(1, "Tag name is required").max(100),
});

export const UpdateTagSchema = z.object({
  name: z.string().min(1, "Tag name is required").max(100),
});

/** Query for GET /contacts/tags. When both absent, API returns all. */
export const ListTagsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) =>
      v === undefined || v === "" ? undefined : Math.max(1, parseInt(v) || 1),
    ),
  limit: z
    .string()
    .optional()
    .transform((v) =>
      v === undefined || v === ""
        ? undefined
        : Math.min(100, Math.max(1, parseInt(v) || 10)),
    ),
  search: z
    .string()
    .optional()
    .transform((s) => (s?.trim() ? s.trim() : undefined)),
});

export const AddNoteSchema = z.object({
  content: z.string().min(1, "Note content is required"),
});

export const AddCommunicationSchema = z.object({
  type: z.enum(["CALL", "EMAIL", "MEETING"]),
  subject: z.string().max(500).optional(),
  notes: z.string().optional(),
});

export type CreateContactDto = z.infer<typeof CreateContactSchema>;
export type UpdateContactDto = z.infer<typeof UpdateContactSchema>;
export type CreateTagDto = z.infer<typeof CreateTagSchema>;
export type UpdateTagDto = z.infer<typeof UpdateTagSchema>;
export type AddNoteDto = z.infer<typeof AddNoteSchema>;
export type AddCommunicationDto = z.infer<typeof AddCommunicationSchema>;
