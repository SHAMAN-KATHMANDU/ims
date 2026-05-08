/**
 * Shared 404 not-found layout — used by all templates.
 *
 * This layout provides a simple, centered error page for when a URL is not found.
 * Includes a heading, message, and a call-to-action button to return home.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "./factories";

export function notFoundLayout(): BlockNode[] {
  resetIdCounter();

  return [
    block("section", {
      background: "default",
      paddingY: "spacious",
    }),
    block("heading", {
      text: "404",
      level: 1,
      alignment: "center",
    }),
    block("heading", {
      text: "Page Not Found",
      level: 2,
      alignment: "center",
    }),
    block("rich-text", {
      source:
        "We couldn't find the page you're looking for. It may have been moved or deleted.",
      alignment: "center",
    }),
    block("button", {
      label: "Back to Home",
      href: "/",
      style: "primary",
    }),
  ];
}
