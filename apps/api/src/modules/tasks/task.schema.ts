import { z } from "zod";

const optionalTrimmedString = z.string().trim().min(1).optional();
const optionalNullableId = z.string().trim().min(1).nullable().optional();
const queryBooleanSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    if (value === "true" || value === "1") return true;
    if (value === "false" || value === "0") return false;
  }
  return value;
}, z.boolean());

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required"),
  dueDate: z.string().datetime().nullable().optional(),
  contactId: optionalNullableId,
  memberId: optionalNullableId,
  dealId: optionalNullableId,
  assignedToId: optionalTrimmedString,
});

export const updateTaskSchema = z.object({
  title: optionalTrimmedString,
  dueDate: z.string().datetime().nullable().optional(),
  completed: z.boolean().optional(),
  contactId: optionalNullableId,
  memberId: optionalNullableId,
  dealId: optionalNullableId,
  assignedToId: optionalTrimmedString,
});

export const taskIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Task ID is required"),
});

export const taskListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  search: z.string().trim().optional(),
  sortBy: z
    .enum(["createdAt", "updatedAt", "dueDate", "title", "id"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  completed: queryBooleanSchema.optional(),
  assignedToId: z.string().trim().optional(),
  dueToday: queryBooleanSchema.optional(),
});
