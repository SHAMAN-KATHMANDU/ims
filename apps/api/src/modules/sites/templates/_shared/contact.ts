/**
 * Shared contact layout — used by all templates for the contact page.
 *
 * This layout provides a two-column layout with contact information on the left
 * and a contact form on the right, plus a newsletter signup section.
 */

import type { BlockNode } from "@repo/shared";
import { block, resetIdCounter } from "./factories";

export interface ContactLayoutOptions {
  heading?: string;
  intro?: string;
}

export function contactLayout(opts: ContactLayoutOptions = {}): BlockNode[] {
  resetIdCounter();

  const heading = opts.heading ?? "Get in Touch";
  const intro =
    opts.intro ??
    "We'd love to hear from you. Send us a message and we'll respond as soon as possible.";

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
    {
      ...block("columns", {
        count: 2,
        gap: "lg",
        verticalAlign: "start",
        stackBelow: "lg",
        stickyFirst: false,
      }),
      children: [
        // Left column: contact information
        block("contact-block", {
          heading: "Contact Info",
          layout: "centered",
          showMap: false,
          showSocials: true,
        }),
        // Right column: contact form
        block("form", {
          heading: "Send us a Message",
          fields: [
            {
              kind: "text",
              label: "Full Name",
              required: true,
              width: "full",
            },
            {
              kind: "email",
              label: "Email",
              required: true,
              width: "full",
            },
            {
              kind: "textarea",
              label: "Message",
              required: true,
              width: "full",
            },
          ],
          submitLabel: "Send",
          successMessage: "Thank you for your message!",
          submitTo: "email",
        }),
      ],
    },
    block("divider", {}),
    block("newsletter", {
      title: "Stay Connected",
      subtitle: "Subscribe to our newsletter for the latest updates.",
      cta: "Subscribe",
    }),
  ];
}
