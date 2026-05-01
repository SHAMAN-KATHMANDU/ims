import type { BlockKind, BlockPropsMap } from "../site-schema/blocks";

export type CatalogCategory =
  | "layout"
  | "content"
  | "commerce"
  | "marketing"
  | "blog"
  | "pdp"
  | "form";

export type CatalogScope =
  | "home"
  | "products-index"
  | "product-detail"
  | "page";

export interface CatalogEntry<K extends BlockKind = BlockKind> {
  id?: string;
  kind: K;
  label: string;
  description: string;
  category: CatalogCategory;
  scopes?: CatalogScope[];
  createDefaultProps: () => BlockPropsMap[K];
}
