/**
 * Editor-mode helper — derives the current high-level workspace mode
 * (Content vs Design) from the URL.
 *
 * Two modes:
 *   - "content" — the Content Hub and every content type (Pages, Blog,
 *     Products, Collections, Categories, Media, Forms). Lives under the
 *     `(admin)` route group with the standard DashboardLayout.
 *   - "design"  — the visual page builder, redirects, domain, and template
 *     picker. Lives under the `(editor)` route group with the slim shell.
 *
 * State-free on purpose: the URL is authoritative. A user landing on any
 * design route is in Design mode, full stop. The top-bar pill toggles by
 * navigating between the two entry routes; lastVisitedDesignPath /
 * lastVisitedContentPath could be persisted later, but until tenants ask
 * for it the URL-only approach keeps the code legible.
 */

export type EditorMode = "content" | "design";

/**
 * Path segments that, when present immediately after the workspace slug,
 * indicate Design mode. Anything else is treated as Content mode.
 *
 * Order doesn't matter; we only test prefix membership.
 */
const DESIGN_SEGMENTS = new Set<string>([
  "site-editor",
  "redirects",
  "domain",
  "templates",
]);

/**
 * Derive the current mode from a Next.js pathname. The pathname is shaped
 * `/[workspace]/[...rest]` — we read the second segment.
 */
export function deriveEditorMode(
  pathname: string | null | undefined,
): EditorMode {
  if (!pathname) return "content";
  const segments = pathname.split("/").filter(Boolean);
  // segments[0] is the workspace slug; segments[1] is the route.
  const route = segments[1];
  if (route && DESIGN_SEGMENTS.has(route)) return "design";
  return "content";
}

/**
 * Entry route for Content mode — the Content Hub landing page.
 */
export function contentEntryPath(workspace: string): string {
  return `/${workspace}/content`;
}

/**
 * Entry route for Design mode — the site editor canvas.
 */
export function designEntryPath(workspace: string): string {
  return `/${workspace}/site-editor`;
}
