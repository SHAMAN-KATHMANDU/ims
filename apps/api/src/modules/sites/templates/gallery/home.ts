/**
 * Gallery template — home layout
 */

import type { BlockNode } from "@repo/shared";
import { block } from "../_shared/factories";

export function galleryHome(): BlockNode[] {
  return [
    block("hero", {
      variant: "editorial",
      title: "Current collection",
      subtitle: "An independent gallery, by appointment",
      ctaLabel: "View the collection",
      ctaHref: "/products",
    }),
    block("bento-showcase", {
      eyebrow: "On view",
      heading: "Current exhibition",
      source: "featured",
      limit: 5,
    }),
    block("category-tiles", {
      heading: "Browse by medium",
      columns: 4,
      aspectRatio: "1/1",
    }),
    block("product-grid", {
      heading: "The permanent collection",
      source: "featured",
      limit: 12,
      columns: 4,
      cardVariant: "bare",
    }),
    block("story-split", {
      eyebrow: "About the gallery",
      title: "A small, independent space",
      body: "We show work by artists we know personally. The roster is small on purpose.",
      imageSide: "right",
    }),
    block("policy-strip", {
      layout: "inline",
      items: [
        { label: "Insured shipping", detail: "Worldwide", icon: "shipping" },
        {
          label: "Certificate",
          detail: "Provenance included",
          icon: "warranty",
        },
        { label: "Private viewing", detail: "By appointment", icon: "support" },
      ],
    }),
    block("testimonials", {
      heading: "From our collectors",
      layout: "stacked",
      items: [
        {
          quote:
            "The gallery pairs pieces with collectors carefully. What I left with felt chosen for me, not sold to me.",
          author: "Rohan V.",
          role: "Collector, Delhi",
        },
        {
          quote:
            "Every acquisition arrives with a letter from the artist. That kind of intimacy is rare now.",
          author: "Claire D.",
          role: "Collector, Montréal",
        },
      ],
    }),
    block("blog-list", { heading: "From the journal", limit: 3, columns: 3 }),
    block("newsletter", {
      title: "Exhibition openings",
      subtitle: "One email per show.",
      cta: "Subscribe",
    }),
  ];
}
