import type { CatalogEntry } from "../types";

export const formCatalog: CatalogEntry<"form"> = {
  kind: "form",
  label: "Form",
  description:
    "Contact or lead-capture form with text, email, dropdown, radio, checkbox, date, number and more.",
  category: "marketing",
  createDefaultProps: () => ({
    heading: "Get in touch",
    description: "We typically reply within one business day.",
    fields: [
      {
        kind: "text",
        label: "Name",
        placeholder: "Your full name",
        required: true,
        width: "half",
      },
      {
        kind: "email",
        label: "Email",
        placeholder: "you@example.com",
        required: true,
        width: "half",
      },
      {
        kind: "phone",
        label: "Phone",
        placeholder: "Optional",
      },
      {
        kind: "select",
        label: "How can we help?",
        options: ["General question", "Support", "Sales", "Partnership"],
        required: true,
      },
      {
        kind: "textarea",
        label: "Message",
        placeholder: "Tell us a bit more…",
        required: true,
      },
    ],
    submitLabel: "Send message",
    successMessage: "Thanks! We'll be in touch.",
    submitTo: "email",
  }),
};
