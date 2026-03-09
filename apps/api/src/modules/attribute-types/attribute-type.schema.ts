import { z } from "zod";

function normalizeCode(val: string): string {
  return val.trim().toLowerCase().replace(/\s+/g, "_");
}

export const CreateAttributeTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  code: z
    .string()
    .optional()
    .transform((v) => (v ? normalizeCode(v) : undefined)),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

export const UpdateAttributeTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? normalizeCode(v) : undefined)),
  displayOrder: z.coerce.number().int().min(0).optional(),
});

export const CreateAttributeValueSchema = z.object({
  value: z.string().min(1, "Value is required").max(255),
  code: z.string().max(50).optional().nullable(),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

export const UpdateAttributeValueSchema = z.object({
  value: z.string().min(1).max(255).optional(),
  code: z.string().max(50).optional().nullable(),
  displayOrder: z.coerce.number().int().min(0).optional(),
});

export type CreateAttributeTypeDto = z.infer<typeof CreateAttributeTypeSchema>;
export type UpdateAttributeTypeDto = z.infer<typeof UpdateAttributeTypeSchema>;
export type CreateAttributeValueDto = z.infer<
  typeof CreateAttributeValueSchema
>;
export type UpdateAttributeValueDto = z.infer<
  typeof UpdateAttributeValueSchema
>;
