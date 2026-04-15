import { SiteEditorPage } from "@/features/tenant-site/site-editor/SiteEditorPage";

export const metadata = { title: "Site design" };

/**
 * Framer-lite block editor for the tenant's website. Loads a scope-scoped
 * SiteLayout into a Zustand store, shows tree/preview/inspector panes, and
 * saves drafts + publishes via /site-layouts.
 *
 * Feature flag + role guards are applied at the layout level.
 */
export default function SiteDesignRoute() {
  return <SiteEditorPage />;
}
