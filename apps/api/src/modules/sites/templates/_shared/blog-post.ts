/**
 * Shared blog-post layout — used by all templates for a single blog post page.
 *
 * This layout provides the structure for rendering a blog post with breadcrumbs,
 * metadata, body content, and related posts. The post body itself is hydrated
 * from the BlogPost data model.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "./factories";

export function blogPostLayout(): BlockNode[] {
  resetIdCounter();

  return [
    block("breadcrumbs", {
      scope: "page",
    }),
    block("heading", {
      text: "Blog Post Title",
      level: 1,
      alignment: "center",
    }),
    block("rich-text", {
      source: "By Author • Published on January 15, 2026",
      alignment: "center",
    }),
    block("markdown-body", {
      source: "# Post Content\n\nStart writing your blog post here.",
    }),
    block("divider", {}),
    block("heading", {
      text: "Related Articles",
      level: 2,
      alignment: "center",
    }),
    block("blog-list", {
      limit: 3,
      columns: 3,
      showExcerpt: false,
      showDate: true,
      showCategory: true,
      showImage: true,
    }),
    block("divider", {}),
    block("rich-text", {
      source: "← Back to Journal",
      alignment: "center",
    }),
  ];
}
