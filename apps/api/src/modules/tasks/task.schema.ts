import { z } from "zod";

export const CreateTaskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(255),
  dueDate: z.string().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  memberId: z.string().uuid().optional().nullable(),
  dealId: z.string().uuid().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  completed: z.boolean().optional(),
});

export const BulkIdsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "At least one task ID is required"),
  reason: z.string().max(500).optional(),
});

export type CreateTaskDto = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskDto = z.infer<typeof UpdateTaskSchema>;
export type BulkIdsDto = z.infer<typeof BulkIdsSchema>;
