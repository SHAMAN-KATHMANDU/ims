import type { CatalogEntry } from "../types";

export const formCatalog: CatalogEntry<"form"> = {
  kind: "form",
  label: "Form",
  description: "Contact or lead-capture form.",
  category: "marketing",
  createDefaultProps: () => ({
    heading: "Get in touch",
    fields: [
      { kind: "text", label: "Name", required: true },
      { kind: "email", label: "Email", required: true },
      { kind: "textarea", label: "Message", placeholder: "How can we help?" },
    ],
    submitLabel: "Send message",
    successMessage: "Thanks! We'll be in touch.",
    submitTo: "email",
  }),
};
