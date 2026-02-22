import { z } from "zod";

const optionalTrimmedString = z.string().trim().min(1).optional();
const optionalNullableId = z.string().trim().min(1).nullable().optional();

export const createTagSchema = z.object({
  name: z.string().trim().min(1, "Tag name is required"),
});

export const createContactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: optionalTrimmedString,
  email: optionalTrimmedString,
  phone: optionalTrimmedString,
  companyId: optionalNullableId,
  memberId: optionalNullableId,
  tagIds: z.array(z.string().trim().min(1)).optional(),
});

export const updateContactSchema = z.object({
  firstName: optionalTrimmedString,
  lastName: optionalTrimmedString.nullable(),
  email: optionalTrimmedString.nullable(),
  phone: optionalTrimmedString.nullable(),
  companyId: optionalNullableId,
  memberId: optionalNullableId,
  tagIds: z.array(z.string().trim().min(1)).optional(),
});

export const addContactNoteSchema = z.object({
  content: z.string().trim().min(1, "Note content is required"),
});

export const addContactCommunicationSchema = z.object({
  type: z.enum(["CALL", "EMAIL", "MEETING"], {
    errorMap: () => ({
      message: "Valid type (CALL, EMAIL, MEETING) is required",
    }),
  }),
  subject: optionalTrimmedString,
  notes: optionalTrimmedString,
});

export const contactIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Contact ID is required"),
});

export const contactListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  search: z.string().trim().optional(),
  sortBy: z
    .enum(["createdAt", "updatedAt", "firstName", "lastName", "email", "id"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  companyId: z.string().trim().optional(),
  tagId: z.string().trim().optional(),
  ownerId: z.string().trim().optional(),
});

export const contactExportQuerySchema = z.object({
  ids: z.string().trim().optional(),
});
