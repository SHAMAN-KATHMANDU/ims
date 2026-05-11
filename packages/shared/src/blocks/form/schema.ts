import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => str(max).optional();

/**
 * Field option for select / radio fields. Authored as either a bare
 * string (label === value) or an `{ label, value }` pair so a tenant
 * can show "Yes" but submit "true". The renderer normalises both
 * shapes internally.
 */
export type FormFieldOption = string | { label: string; value: string };

export const FormFieldOptionSchema: z.ZodType<FormFieldOption> = z.union([
  str(100),
  z
    .object({
      label: str(100),
      value: str(100),
    })
    .strict(),
]);

export type FormFieldKind =
  | "text"
  | "email"
  | "phone"
  | "url"
  | "number"
  | "date"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox";

/**
 * Form field definition.
 *
 * `kind` drives both the rendered control AND the client-side validation
 * (e.g. `email` → `<input type="email">` + browser email validation).
 *
 * `helpText` shows below the field; `placeholder` shows inside the
 * input. They serve different UX purposes — placeholders disappear on
 * focus while helpText stays.
 *
 * `defaultValue` pre-fills the field on mount (handy for pre-selected
 * radio choices). For `checkbox` (single boolean), `defaultValue ===
 * "true"` ticks it.
 */
export interface FormFieldDef {
  kind: FormFieldKind;
  label: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string;
  options?: FormFieldOption[];
  width?: "full" | "half";
  /** Optional client-side regex pattern (text-like fields). */
  pattern?: string;
  /** Inclusive min — number/date min, string minLength. */
  min?: number;
  /** Inclusive max — number/date max, string maxLength. */
  max?: number;
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
  /**
   * Email recipients override for `submitTo="email"`. When empty/undefined,
   * the backend falls back to `SiteConfig.contact.email`.
   */
  recipients?: string[];
  layout?: "stacked" | "inline";
  buttonStyle?: "primary" | "outline" | "ghost";
  buttonAlignment?: "start" | "center" | "stretch";
}

const FormFieldSchema = z
  .object({
    kind: z.enum([
      "text",
      "email",
      "phone",
      "url",
      "number",
      "date",
      "textarea",
      "select",
      "radio",
      "checkbox",
    ]),
    label: str(100),
    required: z.boolean().optional(),
    placeholder: optStr(200),
    helpText: optStr(400),
    defaultValue: optStr(500),
    options: z.array(FormFieldOptionSchema).max(50).optional(),
    width: z.enum(["full", "half"]).optional(),
    pattern: optStr(500),
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .strict();

/**
 * Zod schema for form props validation.
 */
export const FormSchema = z
  .object({
    heading: optStr(200),
    description: optStr(500),
    formId: optStr(36), // UUID
    fields: z.array(FormFieldSchema).max(30).optional(),
    submitLabel: optStr(60),
    successMessage: optStr(500),
    submitTo: z.enum(["email", "crm-lead"]),
    recipients: z.array(z.string().email().max(254)).max(20).optional(),
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
