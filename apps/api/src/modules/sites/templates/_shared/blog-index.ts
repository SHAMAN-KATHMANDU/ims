/**
 * Shared blog-index layout — used by all templates for the blog listing page.
 *
 * This layout is nearly identical across all templates (variation comes
 * from theme tokens, not block structure), so we share a single factory.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "./factories";

export interface BlogIndexLayoutOptions {
  heading?: string;
  intro?: string;
}

export function blogIndexLayout(
  opts: BlogIndexLayoutOptions = {},
): BlockNode[] {
  resetIdCounter();

  const heading = opts.heading ?? "Journal";
  const intro =
    opts.intro ??
    "Insights, stories, and updates from our brand and community.";

  return [
    block("heading", {
      text: heading,
      level: 1,
      alignment: "center",
    }),
    block("rich-text", {
      source: intro,
      alignment: "center",
    }),
    block("blog-list", {
      heading: undefined,
      limit: 12,
      columns: 3,
      showExcerpt: true,
      showDate: true,
      showCategory: true,
      showImage: true,
    }),
    block("divider", {}),
    block("newsletter", {
      title: "Subscribe to our journal",
      subtitle: "Get the latest stories delivered to your inbox.",
      cta: "Subscribe",
    }),
  ];
}
