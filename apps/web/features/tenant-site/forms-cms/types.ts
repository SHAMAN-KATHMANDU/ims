export interface Form {
  id: string;
  name: string;
  submissions: number;
  lastSubmission: string;
  status: "active" | "paused" | "archived";
  fields: FormField[];
  submissionDestination: "email" | "webhook";
  successMessage: string;
}

export interface FormField {
  id: string;
  label: string;
  type:
    | "text"
    | "email"
    | "number"
    | "textarea"
    | "select"
    | "checkbox"
    | "radio";
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface FormSubmission {
  id: string;
  formId: string;
  name: string;
  email: string;
  time: string;
  excerpt: string;
  data: Record<string, unknown>;
}

export interface CreateFormData {
  name: string;
  fields: Omit<FormField, "id">[];
  submissionDestination: "email" | "webhook";
  successMessage: string;
}
