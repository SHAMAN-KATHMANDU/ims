import type { CatalogEntry } from "../types";

export const faqCatalog: CatalogEntry<"faq"> = {
  kind: "faq",
  label: "FAQ",
  description: "Accordion of questions + answers.",
  category: "marketing",
  createDefaultProps: () => ({
    heading: "Questions, answered",
    items: [
      { question: "Do you ship internationally?", answer: "Yes." },
      {
        question: "What's your return policy?",
        answer: "30 days, no hassle.",
      },
    ],
  }),
};
