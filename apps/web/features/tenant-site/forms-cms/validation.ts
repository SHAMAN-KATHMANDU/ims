import { z } from "zod";

export const FormFieldSchema = z.object({
  label: z.string().min(1),
  type: z.enum([
    "text",
    "email",
    "number",
    "textarea",
    "select",
    "checkbox",
    "radio",
  ]),
  required: z.boolean(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
});

export const CreateFormSchema = z.object({
  name: z.string().min(1),
  fields: z.array(FormFieldSchema),
  submissionDestination: z.enum(["email", "webhook"]),
  successMessage: z.string().min(1),
});

export type CreateFormInput = z.infer<typeof CreateFormSchema>;
