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
 */
export interface FormBlockProps {
  heading?: string;
  description?: string;
  fields: FormFieldDef[];
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
      .max(30),
    submitLabel: optStr(60),
    successMessage: optStr(500),
    submitTo: z.enum(["email", "crm-lead"]),
    layout: z.enum(["stacked", "inline"]).optional(),
    buttonStyle: z.enum(["primary", "outline", "ghost"]).optional(),
    buttonAlignment: z.enum(["start", "center", "stretch"]).optional(),
  })
  .strict();

export type FormInput = z.infer<typeof FormSchema>;
