import type React from "react";

/**
 * One row in the Content Hub card grid. Each describes a content type the
 * tenant can manage from the CMS surface.
 *
 * `path` is appended to the workspace base — e.g. for workspace "admin"
 * and path "products", the resulting href is "/admin/products".
 *
 * `count` is optional and may render as "—" while loading or unavailable.
 *
 * `disabled` shows the card greyed out (used for not-yet-implemented routes
 * like Forms in Phase 1; flips to false as later phases land).
 */
export interface ContentTypeCard {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  /** Free-text count line ("12 published", "—", or undefined to omit). */
  count?: string;
  /** Disable navigation; render as muted placeholder. */
  disabled?: boolean;
  /** Group label, used by the Hub for sectioned layout. */
  group: "Site content" | "Catalog" | "Audience" | "Library";
}
