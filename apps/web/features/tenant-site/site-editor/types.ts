import type { SiteLayoutScope } from "@repo/shared";

export type PanelId =
  | "pages"
  | "blocks"
  | "layers"
  | "media"
  | "overview"
  | "branding"
  | "theme"
  | "nav"
  | "seo"
  | "contact"
  | "domain"
  | "blog";

export type EditorTarget = { scope: SiteLayoutScope; pageId: string | null };
