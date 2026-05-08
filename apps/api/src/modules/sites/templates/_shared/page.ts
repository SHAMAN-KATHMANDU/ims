/**
 * Shared page layout — used by all templates for generic CMS custom pages.
 *
 * This layout provides a structured page with a hero section, body content,
 * and a call-to-action band at the bottom. The page body itself is hydrated
 * from the TenantPage data model.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "./factories";

export interface PageLayoutOptions {
  heading?: string;
  intro?: string;
}

export function pageLayout(opts: PageLayoutOptions = {}): BlockNode[] {
  resetIdCounter();

  const heading = opts.heading ?? "Page Title";
  const intro = opts.intro ?? "This is the introduction to your custom page.";

  return [
    block("hero", {
      variant: "standard",
      title: heading,
      subtitle: intro,
      heroLayout: "centered",
    }),
    block("section", {
      background: "default",
      paddingY: "spacious",
    }),
    block("markdown-body", {
      source: "# Page Content\n\nAdd your page content here.",
    }),
    block("divider", {}),
    block("newsletter", {
      title: "Stay Updated",
      subtitle: "Get notified about new content and updates.",
      cta: "Subscribe",
    }),
  ];
}
