import type { CatalogEntry } from "../types";

export const testimonialsCatalog: CatalogEntry<"testimonials"> = {
  kind: "testimonials",
  label: "Testimonials",
  description: "Customer quote cards.",
  category: "marketing",
  createDefaultProps: () => ({
    heading: "What people say",
    items: [{ quote: "Loved it.", author: "Someone", role: "Happy customer" }],
  }),
};
