import type {
  BlockKind,
  BlockPropsMap,
  SiteLayoutScope,
} from "../site-schema/blocks";

export type CatalogCategory =
  | "layout"
  | "content"
  | "commerce"
  | "marketing"
  | "blog"
  | "pdp"
  | "form";

// Derived from SITE_LAYOUT_SCOPES so adding a new scope to the runtime
// enum automatically widens what `scopes:` declarations on a CatalogEntry
// can reference. Without this, scopes like "offers" / "blog-index" /
// "landing" silently filtered blocks out of the editor palette + slash menu.
export type CatalogScope = SiteLayoutScope;

export interface CatalogEntry<K extends BlockKind = BlockKind> {
  id?: string;
  kind: K;
  label: string;
  description: string;
  category: CatalogCategory;
  scopes?: CatalogScope[];
  createDefaultProps: () => BlockPropsMap[K];
}
