import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Form field definition.
 */
export interface FormFieldDef {
  kind: "text" | "email" | "textarea" | "phone" | "select";
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  width?: "full" | "half";
}

/**
 * Form block — contact or lead-capture form.
 * Can be either inline (fields[] defined locally) or reference a stored Form via formId.
 */
export interface FormBlockProps {
  heading?: string;
  description?: string;
  formId?: string; // Reference to a stored Form; takes precedence over inline fields
  fields?: FormFieldDef[]; // Inline field definitions (used if formId not set)
  submitLabel?: string;
  successMessage?: string;
  submitTo: "email" | "crm-lead";
  layout?: "stacked" | "inline";
  buttonStyle?: "primary" | "outline" | "ghost";
  buttonAlignment?: "start" | "center" | "stretch";
}

/**
 * Zod schema for form props validation.
 */
export const FormSchema = z
  .object({
    heading: optStr(200),
    description: optStr(500),
    formId: optStr(36), // UUID
    fields: z
      .array(
        z
          .object({
            kind: z.enum(["text", "email", "textarea", "phone", "select"]),
            label: str(100),
            required: z.boolean().optional(),
            placeholder: optStr(200),
            options: z.array(z.string().max(100)).max(50).optional(),
            width: z.enum(["full", "half"]).optional(),
          })
          .strict(),
      )
      .max(30)
      .optional(),
    submitLabel: optStr(60),
    successMessage: optStr(500),
    submitTo: z.enum(["email", "crm-lead"]),
    layout: z.enum(["stacked", "inline"]).optional(),
    buttonStyle: z.enum(["primary", "outline", "ghost"]).optional(),
    buttonAlignment: z.enum(["start", "center", "stretch"]).optional(),
  })
  .strict()
  .refine(
    (data) => data.formId || (data.fields && data.fields.length > 0),
    "Either formId or fields must be provided",
  );

export type FormInput = z.infer<typeof FormSchema>;
