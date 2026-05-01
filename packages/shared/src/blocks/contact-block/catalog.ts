import type { CatalogEntry } from "../types";

export const contactBlockCatalog: CatalogEntry<"contact-block"> = {
  kind: "contact-block",
  label: "Contact info",
  description: "Email / phone / address.",
  category: "marketing",
  createDefaultProps: () => ({ heading: "Get in touch" }),
};
