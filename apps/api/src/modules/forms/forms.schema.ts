import { z } from "zod";

const str = (max: number) => z.string().trim().min(1).max(max);
const optStr = (max: number) => z.string().trim().max(max).optional();

// FormFieldDef schema — matches packages/shared/src/blocks/form/schema.ts
const FormFieldDefSchema = z.object({
  kind: z.enum(["text", "email", "textarea", "phone", "select"]),
  label: str(100),
  required: z.boolean().optional(),
  placeholder: optStr(200),
  options: z.array(z.string().max(100)).max(50).optional(),
  width: z.enum(["full", "half"]).optional(),
});

export const CreateFormSchema = z.object({
  name: str(200),
  slug: str(100),
  description: optStr(500),
  fields: z.array(FormFieldDefSchema).max(30),
  submitTo: z.enum(["email", "webhook", "crm-lead"]).default("email"),
  recipients: z.array(z.string().email().max(254)).max(20).default([]),
  successMessage: optStr(500),
  status: z.enum(["draft", "active", "paused"]).default("draft"),
});

export type CreateFormInput = z.infer<typeof CreateFormSchema>;

export const UpdateFormSchema = CreateFormSchema.partial();

export type UpdateFormInput = z.infer<typeof UpdateFormSchema>;
